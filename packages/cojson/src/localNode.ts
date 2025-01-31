import {
    AgentSecret,
    agentSecretFromSecretSeed,
    createdNowUnique,
    getAgentID,
    getAgentSealerID,
    getAgentSealerSecret,
    newRandomAgentSecret,
    newRandomKeySecret,
    seal,
} from "./crypto.js";
import {
    CoValueCore,
    CoValueHeader,
    newRandomSessionID,
} from "./coValueCore.js";
import {
    InviteSecret,
    Group,
    secretSeedFromInviteSecret,
} from "./coValues/group.js";
import { Peer, SyncManager } from "./sync.js";
import { AgentID, RawCoID, SessionID, isAgentID } from "./ids.js";
import { CoID } from "./coValue.js";
import {
    Account,
    AccountMeta,
    accountHeaderForInitialAgentSecret,
    GeneralizedControlledAccount,
    ControlledAccount,
    AnonymousControlledAccount,
    AccountID,
    Profile,
    AccountMigration,
} from "./coValues/account.js";
import { CoMap } from "./coValues/coMap.js";
import { CoValue } from "./index.js";
import { expectGroup } from "./typeUtils/expectGroup.js";

/** A `LocalNode` represents a local view of a set of loaded `CoValue`s, from the perspective of a particular account (or primitive cryptographic agent).

A `LocalNode` can have peers that it syncs to, for example some form of local persistence, or a sync server, such as `sync.jazz.tools` (Jazz Global Mesh).

@example
You typically get hold of a `LocalNode` using `jazz-react`'s `useJazz()`:

```typescript
const { localNode } = useJazz();
```
*/
export class LocalNode {
    /** @internal */
    coValues: { [key: RawCoID]: CoValueState } = {};
    /** @category 3. Low-level */
    account: GeneralizedControlledAccount;
    /** @category 3. Low-level */
    currentSessionID: SessionID;
    /** @category 3. Low-level */
    syncManager = new SyncManager(this);

    /** @category 3. Low-level */
    constructor(
        account: GeneralizedControlledAccount,
        currentSessionID: SessionID
    ) {
        this.account = account;
        this.currentSessionID = currentSessionID;
    }

    /** @category 2. Node Creation */
    static withNewlyCreatedAccount<
        P extends Profile = Profile,
        R extends CoMap = CoMap,
        Meta extends AccountMeta = AccountMeta
    >({
        name,
        migration,
        initialAgentSecret = newRandomAgentSecret(),
    }: {
        name: string;
        migration?: AccountMigration<P, R, Meta>;
        initialAgentSecret?: AgentSecret;
    }): {
        node: LocalNode;
        accountID: AccountID;
        accountSecret: AgentSecret;
        sessionID: SessionID;
    } {
        const throwawayAgent = newRandomAgentSecret();
        const setupNode = new LocalNode(
            new AnonymousControlledAccount(throwawayAgent),
            newRandomSessionID(getAgentID(throwawayAgent))
        );

        const account = setupNode.createAccount(name, initialAgentSecret);

        const nodeWithAccount = account.core.node.testWithDifferentAccount(
            account,
            newRandomSessionID(account.id)
        );

        const accountOnNodeWithAccount =
            nodeWithAccount.account as ControlledAccount<P, R, Meta>;

        const profile = nodeWithAccount.expectProfileLoaded(
            accountOnNodeWithAccount.id,
            "After creating account"
        );

        if (migration) {
            migration(accountOnNodeWithAccount, profile as P);
            nodeWithAccount.account = new ControlledAccount(
                accountOnNodeWithAccount.core,
                accountOnNodeWithAccount.agentSecret
            );
        }

        return {
            node: nodeWithAccount,
            accountID: accountOnNodeWithAccount.id,
            accountSecret: accountOnNodeWithAccount.agentSecret,
            sessionID: nodeWithAccount.currentSessionID,
        };
    }

    /** @category 2. Node Creation */
    static async withLoadedAccount<
        P extends Profile = Profile,
        R extends CoMap = CoMap,
        Meta extends AccountMeta = AccountMeta
    >({
        accountID,
        accountSecret,
        sessionID,
        peersToLoadFrom,
        migration,
    }: {
        accountID: AccountID;
        accountSecret: AgentSecret;
        sessionID: SessionID;
        peersToLoadFrom: Peer[];
        migration?: AccountMigration<P, R, Meta>;
    }): Promise<LocalNode> {
        const loadingNode = new LocalNode(
            new AnonymousControlledAccount(accountSecret),
            newRandomSessionID(accountID)
        );

        const accountPromise = loadingNode.load(accountID);

        for (const peer of peersToLoadFrom) {
            loadingNode.syncManager.addPeer(peer);
        }

        const account = await accountPromise;
        const controlledAccount = new ControlledAccount(
            account.core,
            accountSecret
        );

        // since this is all synchronous, we can just swap out nodes for the SyncManager
        const node = loadingNode.testWithDifferentAccount(
            controlledAccount,
            sessionID
        );
        node.syncManager = loadingNode.syncManager;
        node.syncManager.local = node;

        controlledAccount.core.node = node;

        const profileID = account.get("profile");
        if (!profileID) {
            throw new Error("Account has no profile");
        }
        const profile = await node.load(profileID);

        if (migration) {
            migration(
                controlledAccount as ControlledAccount<P, R, Meta>,
                profile as P
            );
            node.account = new ControlledAccount(
                controlledAccount.core,
                controlledAccount.agentSecret
            );
        }

        return node;
    }

    /** @internal */
    createCoValue(header: CoValueHeader): CoValueCore {
        const coValue = new CoValueCore(header, this);
        this.coValues[coValue.id] = { state: "loaded", coValue: coValue };

        void this.syncManager.syncCoValue(coValue);

        return coValue;
    }

    /** @internal */
    loadCoValue(id: RawCoID, onProgress?: (progress: number) => void): Promise<CoValueCore> {
        let entry = this.coValues[id];
        if (!entry) {
            entry = newLoadingState(onProgress);

            this.coValues[id] = entry;

            this.syncManager.loadFromPeers(id);
        }
        if (entry.state === "loaded") {
            return Promise.resolve(entry.coValue);
        }
        return entry.done;
    }

    /**
     * Loads a CoValue's content, syncing from peers as necessary and resolving the returned
     * promise once a first version has been loaded. See `coValue.subscribe()` and `node.useTelepathicData()`
     * for listening to subsequent updates to the CoValue.
     *
     * @category 3. Low-level
     */
    async load<T extends CoValue>(id: CoID<T>, onProgress?: (progress: number) => void): Promise<T> {
        return (await this.loadCoValue(id, onProgress)).getCurrentContent() as T;
    }

    /** @category 3. Low-level */
    subscribe<T extends CoValue>(
        id: CoID<T>,
        callback: (update: T) => void
    ): () => void {
        let stopped = false;
        let unsubscribe!: () => void;

        console.log("Subscribing to " + id);

        this.load(id)
            .then((coValue) => {
                if (stopped) {
                    return;
                }
                unsubscribe = coValue.subscribe(callback);
            })
            .catch((e) => {
                console.error("Error subscribing to ", id, e);
            });

        return () => {
            console.log("Unsubscribing from " + id);
            stopped = true;
            unsubscribe?.();
        };
    }

    /** @deprecated Use Account.acceptInvite instead */
    async acceptInvite<T extends CoValue>(
        groupOrOwnedValueID: CoID<T>,
        inviteSecret: InviteSecret
    ): Promise<void> {
        const groupOrOwnedValue = await this.load(groupOrOwnedValueID);

        if (groupOrOwnedValue.core.header.ruleset.type === "ownedByGroup") {
            return this.acceptInvite(
                groupOrOwnedValue.core.header.ruleset.group as CoID<Group>,
                inviteSecret
            );
        } else if (groupOrOwnedValue.core.header.ruleset.type !== "group") {
            throw new Error("Can only accept invites to groups");
        }

        const group = expectGroup(groupOrOwnedValue);

        const inviteAgentSecret = agentSecretFromSecretSeed(
            secretSeedFromInviteSecret(inviteSecret)
        );
        const inviteAgentID = getAgentID(inviteAgentSecret);

        const inviteRole = await new Promise((resolve, reject) => {
            group.subscribe((groupUpdate) => {
                const role = groupUpdate.get(inviteAgentID);
                if (role) {
                    resolve(role);
                }
            });
            setTimeout(
                () => reject(new Error("Couldn't find invite before timeout")),
                2000
            );
        });

        if (!inviteRole) {
            throw new Error("No invite found");
        }

        const existingRole = group.get(this.account.id);

        if (
            existingRole === "admin" ||
            (existingRole === "writer" && inviteRole === "writerInvite") ||
            (existingRole === "writer" && inviteRole === "reader") ||
            (existingRole === "reader" && inviteRole === "readerInvite")
        ) {
            console.debug(
                "Not accepting invite that would replace or downgrade role"
            );
            return;
        }

        const groupAsInvite = expectGroup(
            group.core
                .testWithDifferentAccount(
                    new AnonymousControlledAccount(inviteAgentSecret),
                    newRandomSessionID(inviteAgentID)
                )
                .getCurrentContent()
        );

        groupAsInvite.addMemberInternal(
            this.account.id,
            inviteRole === "adminInvite"
                ? "admin"
                : inviteRole === "writerInvite"
                ? "writer"
                : "reader"
        );

        group.core._sessions = groupAsInvite.core.sessions;
        group.core._cachedContent = undefined;

        for (const groupListener of group.core.listeners) {
            groupListener(group.core.getCurrentContent());
        }
    }

    /** @internal */
    expectCoValueLoaded(id: RawCoID, expectation?: string): CoValueCore {
        const entry = this.coValues[id];
        if (!entry) {
            throw new Error(
                `${expectation ? expectation + ": " : ""}Unknown CoValue ${id}`
            );
        }
        if (entry.state === "loading") {
            throw new Error(
                `${
                    expectation ? expectation + ": " : ""
                }CoValue ${id} not yet loaded`
            );
        }
        return entry.coValue;
    }

    /** @internal */
    expectProfileLoaded(id: AccountID, expectation?: string): Profile {
        const account = this.expectCoValueLoaded(id, expectation);
        const profileID = expectGroup(account.getCurrentContent()).get(
            "profile"
        );
        if (!profileID) {
            throw new Error(
                `${
                    expectation ? expectation + ": " : ""
                }Account ${id} has no profile`
            );
        }
        return this.expectCoValueLoaded(
            profileID,
            expectation
        ).getCurrentContent() as Profile;
    }

    /** @internal */
    createAccount(
        name: string,
        agentSecret = newRandomAgentSecret()
    ): ControlledAccount {
        const accountAgentID = getAgentID(agentSecret);
        let account = expectGroup(
            this.createCoValue(accountHeaderForInitialAgentSecret(agentSecret))
                .testWithDifferentAccount(
                    new AnonymousControlledAccount(agentSecret),
                    newRandomSessionID(accountAgentID)
                )
                .getCurrentContent()
        );

        account = account.mutate((editable) => {
            editable.set(accountAgentID, "admin", "trusting");

            const readKey = newRandomKeySecret();

            const sealed = seal({
                message: readKey.secret,
                from: getAgentSealerSecret(agentSecret),
                to: getAgentSealerID(accountAgentID),
                nOnceMaterial: {
                    in: account.id,
                    tx: account.core.nextTransactionID(),
                },
            });

            console.log(
                "Creating read key",
                getAgentSealerSecret(agentSecret),
                getAgentSealerID(accountAgentID),
                account.id,
                account.core.nextTransactionID(),
                "in session",
                account.core.node.currentSessionID,
                "=",
                sealed
            );
            editable.set(
                `${readKey.id}_for_${accountAgentID}`,
                sealed,
                "trusting"
            );

            editable.set("readKey", readKey.id, "trusting");
        });

        const profile = account.createMap<Profile>(
            { name },
            {
                type: "profile",
            },
            "trusting"
        );

        account = account.set("profile", profile.id, "trusting");

        const accountOnThisNode = this.expectCoValueLoaded(account.id);

        accountOnThisNode._sessions = {
            ...account.core.sessions,
        };
        accountOnThisNode._cachedContent = undefined;

        const profileOnThisNode = this.createCoValue(profile.core.header);

        profileOnThisNode._sessions = {
            ...profile.core.sessions,
        };
        profileOnThisNode._cachedContent = undefined;

        return new ControlledAccount(accountOnThisNode, agentSecret);
    }

    /** @internal */
    resolveAccountAgent(
        id: AccountID | AgentID,
        expectation?: string
    ): AgentID {
        if (isAgentID(id)) {
            return id;
        }

        const coValue = this.expectCoValueLoaded(id, expectation);

        if (
            coValue.header.type !== "comap" ||
            coValue.header.ruleset.type !== "group" ||
            !coValue.header.meta ||
            !("type" in coValue.header.meta) ||
            coValue.header.meta.type !== "account"
        ) {
            throw new Error(
                `${
                    expectation ? expectation + ": " : ""
                }CoValue ${id} is not an account`
            );
        }

        return new Account(coValue).getCurrentAgentID();
    }

    /**
     * @deprecated use Account.createGroup() instead
     */
    createGroup(): Group {
        const groupCoValue = this.createCoValue({
            type: "comap",
            ruleset: { type: "group", initialAdmin: this.account.id },
            meta: null,
            ...createdNowUnique(),
        });

        let group = expectGroup(groupCoValue.getCurrentContent());

        group = group.mutate((editable) => {
            editable.set(this.account.id, "admin", "trusting");

            const readKey = newRandomKeySecret();

            editable.set(
                `${readKey.id}_for_${this.account.id}`,
                seal({
                    message: readKey.secret,
                    from: this.account.currentSealerSecret(),
                    to: this.account.currentSealerID(),
                    nOnceMaterial: {
                        in: groupCoValue.id,
                        tx: groupCoValue.nextTransactionID(),
                    },
                }),
                "trusting"
            );

            editable.set("readKey", readKey.id, "trusting");
        });

        return group;
    }

    /** @internal */
    testWithDifferentAccount(
        account: GeneralizedControlledAccount,
        currentSessionID: SessionID
    ): LocalNode {
        const newNode = new LocalNode(account, currentSessionID);

        const coValuesToCopy = Object.entries(this.coValues);

        while (coValuesToCopy.length > 0) {
            const [coValueID, entry] =
                coValuesToCopy[coValuesToCopy.length - 1]!;

            if (entry.state === "loading") {
                coValuesToCopy.pop();
                continue;
            } else {
                const allDepsCopied = entry.coValue
                    .getDependedOnCoValues()
                    .every((dep) => newNode.coValues[dep]?.state === "loaded");

                if (!allDepsCopied) {
                    // move to end of queue
                    coValuesToCopy.unshift(coValuesToCopy.pop()!);
                    continue;
                }

                const newCoValue = new CoValueCore(
                    entry.coValue.header,
                    newNode,
                    { ...entry.coValue.sessions }
                );

                newNode.coValues[coValueID as RawCoID] = {
                    state: "loaded",
                    coValue: newCoValue,
                };

                coValuesToCopy.pop();
            }
        }

        if (account instanceof ControlledAccount) {
            // To make sure that when we edit the account, we're modifying the correct sessions
            const accountInNode = new ControlledAccount(
                newNode.expectCoValueLoaded(account.id),
                account.agentSecret
            );
            if (accountInNode.core.node !== newNode) {
                throw new Error("Account's node is not the new node");
            }
            newNode.account = accountInNode;
        }

        return newNode;
    }
}

/** @internal */
type CoValueState =
    | {
          state: "loading";
          done: Promise<CoValueCore>;
          resolve: (coValue: CoValueCore) => void;
          onProgress?: (progress: number) => void;
      }
    | { state: "loaded"; coValue: CoValueCore; onProgress?: (progress: number) => void; };

/** @internal */
export function newLoadingState(onProgress?: (progress: number) => void): CoValueState {
    let resolve: (coValue: CoValueCore) => void;

    const promise = new Promise<CoValueCore>((r) => {
        resolve = r;
    });

    return {
        state: "loading",
        done: promise,
        resolve: resolve!,
        onProgress
    };
}
