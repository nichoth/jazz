import {
    ReadableStream,
    TransformStream,
    WritableStream,
} from "isomorphic-streams";
import { Peer, PeerID, SyncMessage } from "./sync.js";

export function connectedPeers(
    peer1id: PeerID,
    peer2id: PeerID,
    {
        trace = false,
        peer1role = "peer",
        peer2role = "peer",
    }: {
        trace?: boolean;
        peer1role?: Peer["role"];
        peer2role?: Peer["role"];
    } = {}
): [Peer, Peer] {
    const [inRx1, inTx1] = newStreamPair<SyncMessage>();
    const [outRx1, outTx1] = newStreamPair<SyncMessage>();

    const [inRx2, inTx2] = newStreamPair<SyncMessage>();
    const [outRx2, outTx2] = newStreamPair<SyncMessage>();

    void outRx2
        .pipeThrough(
            new TransformStream({
                transform(
                    chunk: SyncMessage,
                    controller: { enqueue: (msg: SyncMessage) => void }
                ) {
                    trace &&
                        console.debug(
                            `${peer2id} -> ${peer1id}`,
                            JSON.stringify(
                                chunk,
                                (k, v) =>
                                    (k === "changes" || k === "encryptedChanges")
                                        ? v.slice(0, 20) + "..."
                                        : v,
                                2
                            )
                        );
                    controller.enqueue(chunk);
                },
            })
        )
        .pipeTo(inTx1);

    void outRx1
        .pipeThrough(
            new TransformStream({
                transform(
                    chunk: SyncMessage,
                    controller: { enqueue: (msg: SyncMessage) => void }
                ) {
                    trace &&
                        console.debug(
                            `${peer1id} -> ${peer2id}`,
                            JSON.stringify(
                                chunk,
                                (k, v) =>
                                    (k === "changes" || k === "encryptedChanges")
                                        ? v.slice(0, 20) + "..."
                                        : v,
                                2
                            )
                        );
                    controller.enqueue(chunk);
                },
            })
        )
        .pipeTo(inTx2);

    const peer2AsPeer: Peer = {
        id: peer2id,
        incoming: inRx1,
        outgoing: outTx1,
        role: peer2role,
    };

    const peer1AsPeer: Peer = {
        id: peer1id,
        incoming: inRx2,
        outgoing: outTx2,
        role: peer1role,
    };

    return [peer1AsPeer, peer2AsPeer];
}

export function newStreamPair<T>(): [ReadableStream<T>, WritableStream<T>] {
    let readerClosed = false;

    let resolveEnqueue: (enqueue: (item: T) => void) => void;
    const enqueuePromise = new Promise<(item: T) => void>((resolve) => {
        resolveEnqueue = resolve;
    });

    let resolveClose: (close: () => void) => void;
    const closePromise = new Promise<() => void>((resolve) => {
        resolveClose = resolve;
    });

    const readable = new ReadableStream<T>({
        async start(controller) {
            resolveEnqueue(controller.enqueue.bind(controller));
            resolveClose(controller.close.bind(controller));
        },

        cancel(_reason) {
            console.log("Manually closing reader");
            readerClosed = true;
        },
    });

    let lastWritePromise = Promise.resolve();

    const writable = new WritableStream<T>({
        async write(chunk) {
            const enqueue = await enqueuePromise;
            if (readerClosed) {
                throw new Error("Reader closed");
            } else {
                // make sure write resolves before corresponding read, but make sure writes are still in order
                await lastWritePromise;
                lastWritePromise = new Promise((resolve) => {
                    setTimeout(() => {
                        enqueue(chunk);
                        resolve();
                    });
                });
            }
        },
        async abort(reason) {
            console.debug("Manually closing writer", reason);
            const close = await closePromise;
            close();
        },
    });

    return [readable, writable];
}
