// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionConfirmationStrategy, TransactionInstruction } from '@solana/web3.js'
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createMintToCollectionV1Instruction, TokenProgramVersion, TokenStandard } from "@metaplex-foundation/mpl-bubblegum";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, ValidDepthSizePair, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import type { NextApiRequest, NextApiResponse } from 'next';
import * as base58 from "base-58";
import { type } from 'os';

export const YT_COLLECTION = "3XfkDtSZZ586DztsjeVpTV3TLMYHRci2tkwTBoGzFvfz";
export const YT_COLLECTION_PRICE = 0

export type CnftInfo = {
    name: string,
    symbol?: string,
    collection?: string, //pubkey
    uri: string,
    tree?: string, //pubkey
}
function getCNFTInfo(cnfttag: string): CnftInfo | null {
    const infodict = require('../../../data/cnfts.json')
    if (cnfttag in infodict) {
        const info = infodict[cnfttag] as CnftInfo;
        console.log(info)
        return info;
    }
    return null;
}

type ErrorData = {
    error: string
}
type GetData = {
    label: string
    icon: string
}
type PostData = {
    transaction: string,
    message?: string
}

function get(
    req: NextApiRequest,
    res: NextApiResponse<GetData>
) {
    const label = 'RB Minter';
    const icon = 'https://shdw-drive.genesysgo.net/BBayKe9v2acgiM6LpEio9dA1nxHHg2S6UsYrZuTVxZZL/POA_rb_test.png';

    res.status(200).send({
        label,
        icon,
    });
}

async function post(
    req: NextApiRequest,
    res: NextApiResponse<PostData>, cnftInfo: CnftInfo
) {
    // Account provided in the transaction request body by the wallet.
    let accountField = req.body?.account;
    if (!accountField) throw new Error('missing account');

    console.log("mint reqest by " + accountField);

    const user = new PublicKey(accountField);

    const [transaction, message] = await createTransaction(user, cnftInfo);

    // Serialize and return the unsigned transaction.
    const serializedTransaction = transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).send({ transaction: base64Transaction, message });

}

const DEBUGGING = true

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetData | PostData | ErrorData>
) {
    const { cnfttag } = req.query;
    const info = getCNFTInfo(cnfttag as string);
    if (!info) {
        res.status(404).send({ error: "cnft tag not found bitch" });
        return;
    }
    if (req.method == "GET") {
        console.log("received GET request for " + cnfttag);
        if (DEBUGGING) {
            return await post(req, res, info);
        }
        return get(req, res);
    } else if (req.method == "POST") {
        console.log("received POST request for " + cnfttag);
        return await post(req, res, info);
    }
}

function getDefaultPriceForCollection(collection: PublicKey) {
    if (collection.toBase58() == YT_COLLECTION) {
        return YT_COLLECTION_PRICE;
    }
    return 0;
}


async function createTransaction(user: PublicKey, cnftInfo: CnftInfo): Promise<[Transaction, string]> {


    const authority = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(process.env.AUTHORITY_KEY)),
    ); // tree and collection authority

    const tree = new PublicKey("ERkzt2Zyau5nnSf877FCQNzQRRxW5xaMJEt4DQhYX97T");

    const collectionMint = new PublicKey(cnftInfo.collection || YT_COLLECTION);

    const price = getDefaultPriceForCollection(collectionMint) * LAMPORTS_PER_SOL;

    // Build Transaction
    const ix = await createMintCNFTInstruction(tree, collectionMint, user, authority.publicKey, cnftInfo);

    let transaction = new Transaction();
    transaction.add(ix);

    const connection = new Connection('https://api.devnet.solana.com')
    const bh = await connection.getLatestBlockhash();
    transaction.recentBlockhash = bh.blockhash;
    transaction.feePayer = authority.publicKey     // user; -> C'est moi qui paye le frais de transaction. Ca peut etre le user aussi si je veux. 

    // for correct account ordering 
    transaction = Transaction.from(transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    }));

    transaction.sign(authority);
    const message = 'minting cNFT'
    return [transaction, message];


    async function createMintCNFTInstruction(merkleTree: PublicKey, collectionMint: PublicKey, user: PublicKey, authority: PublicKey, cnftInfo: CnftInfo) {

        const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
            [merkleTree.toBuffer()],
            BUBBLEGUM_PROGRAM_ID,
        );

        const [collectionMetadataAccount, _b1] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata", "utf8"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                collectionMint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );
        const [collectionEditionAccount, _b2] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata", "utf8"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                collectionMint.toBuffer(),
                Buffer.from("edition", "utf8"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );
        const [bgumSigner, __] = PublicKey.findProgramAddressSync(
            [Buffer.from("collection_cpi", "utf8")],
            BUBBLEGUM_PROGRAM_ID
        );

        const ix = await createMintToCollectionV1Instruction({
            treeAuthority: treeAuthority,
            leafOwner: user,
            leafDelegate: user,
            merkleTree: merkleTree,
            payer: user,
            treeDelegate: authority,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            collectionAuthority: authority,
            collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
            collectionMint: collectionMint,
            collectionMetadata: collectionMetadataAccount,
            editionAccount: collectionEditionAccount,
            bubblegumSigner: bgumSigner,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        }, {
            metadataArgs: {
                collection: { key: collectionMint, verified: false },
                creators: [],
                isMutable: true,
                name: cnftInfo.name,
                primarySaleHappened: true,
                sellerFeeBasisPoints: 0,
                symbol: cnftInfo.symbol || "CAS",
                uri: "https://shdw-drive.genesysgo.net/BBayKe9v2acgiM6LpEio9dA1nxHHg2S6UsYrZuTVxZZL/cNFTrb_metadata.json",
                uses: null,
                tokenStandard: TokenStandard.NonFungible,
                editionNonce: null,
                tokenProgramVersion: TokenProgramVersion.Original
            }
        });

        return ix;
    }
