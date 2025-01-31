import { ComingSoonBadge, Grid, GridCard, GridItem } from "./forMdx";

export function Pricing() {
    const pricePer1MtxSyncedOut = 2;
    const pricePer1MtxStored = 4;

    const pricePerTxSyncedOut = pricePer1MtxSyncedOut / 1_000_000;
    const pricePerTxStored = pricePer1MtxStored / 1_000_000;

    const worstCaseBytesPerTx = 200_000;
    const avgCaseBytesPerTx = 10_000;

    const worstCaseCostPerTBstorage = 20;
    const worstCaseCostPerTxStored =
        worstCaseBytesPerTx * (worstCaseCostPerTBstorage / 1_000_000_000_000);
    const avgCaseCostPerTxStored =
        avgCaseBytesPerTx * (worstCaseCostPerTBstorage / 1_000_000_000_000);

    const costPerTBEgress = 5;
    const serverCost = 30;
    const txOutPerSecondPerServer = 100;
    const txPerMonthPerServer = txOutPerSecondPerServer * 60 * 60 * 24 * 30;
    const worstCaseCostPerTxSyncedOut =
        worstCaseBytesPerTx * (costPerTBEgress / 1_000_000_000_000) +
        serverCost / txPerMonthPerServer;
    const avgCaseCostPerTxSyncedOut =
        avgCaseBytesPerTx * (costPerTBEgress / 1_000_000_000_000) +
        serverCost / txPerMonthPerServer;

    const recommendedSyncToStorageRatio = 0.2;

    const freeTierSyncedOut = 100_000;
    const freeTierStored = freeTierSyncedOut / recommendedSyncToStorageRatio;

    const proTierSyncedOut = 500_000;
    const proTierStored = proTierSyncedOut / recommendedSyncToStorageRatio;

    return (
        <Grid>
            <GridCard>
                <h3>Free Tier</h3>
                <p className="text-lg line-through">Any usage under $2/mo is free!</p>
                <p className="text-lg font-medium bg-amber-200 dark:bg-amber-800 px-2 py-1 rounded">Until we implement API keys and billing all usage of Global Mesh is free!</p>
            </GridCard>
            <GridCard>
                <h3>Unlimited <ComingSoonBadge/></h3>
                <p className="text-lg line-through">
                    {fmt$(pricePer1MtxSyncedOut)} per 1,000,000 transactions
                    synced out
                    {/* <br />
                    Avg cost: {fmt$(avgCaseCostPerTxSyncedOut * 1_000_000)}
                    <br />
                    Worst cost: {fmt$(worstCaseCostPerTxSyncedOut * 1_000_000)} */}
                <br/>
                    {fmt$(pricePer1MtxStored)}
                    <small>/mo</small> per 1,000,000 transactions stored
                    {/* <br />
                    Avg cost: {fmt$(avgCaseCostPerTxStored * 1_000_000)}
                    <br />
                    Worst cost: {fmt$(worstCaseCostPerTxStored * 1_000_000)} */}
                </p>
                <p className="text-sm">Transactions usually represent individual user actions, or up to 100KB of binary data.</p>
            </GridCard>
            <GridCard>
                <h3>Enterprise</h3>
                <p className="text-sm">Custom deployment in the cloud, your private cloud, on-premises or hybrids?</p>
                <p className="text-sm">SLAs and dedicated support? White-glove integration services?</p>
            </GridCard>
        </Grid>
    );
}

function fmt(num: number) {
    return num.toLocaleString("en-US", {});
}

function fmt$(num: number) {
    return (
        "$" +
        num.toLocaleString("en-US", {
            maximumSignificantDigits: 3,
        })
    );
}
