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
    res: NextApiResponse,
) {
    // Account provided in the transaction request body by the wallet.
    let accountField = req.body?.account;
    if (!accountField) throw new Error('missing account');

    //console.log("mint requested by " + accountField);

    const user = new PublicKey(accountField);
    //console.log('the user is: ', user)  //PublicKey [PublicKey(c9Mw4mMdXKnzZFZJdGTC5EJa13Shne2mdRAiDhX5GHK)] {_bn: <BN: 900c8323b95ceaca68b113d54a82fdc893c24648ccf370b7acb9049099cecce>}
    //console.log('the user is: ', user.toBase58())   //c9Mw4mMdXKnzZFZJdGTC5EJa13Shne2mdRAiDhX5GHK




    //const myTransaction = await dfdf(user);

    //const authority = Keypair.fromSecretKey(
    //    new Uint8Array(JSON.parse(process.env.AUTHORITY_KEY)),
    //); // tree and collection authority

    const authoritySecret = JSON.parse(process.env.AUTHORITY_KEY ?? "") as number[]
    const authoritySecretKey = Uint8Array.from(authoritySecret)
    const authority = Keypair.fromSecretKey(authoritySecretKey) //
    //const authorityPublicKey = authority.publicKey  // this works too
    //console.log('the authority is: ', authority)  // Keypair {_keypair: {publicKey: Uint8Array(32) [195... 150], secretKey: Uint8Array(64) [15,  41, ... 150]}}
    //console.log('the authority.publicKey is: ', authority.publicKey)  // PublicKey [PublicKey(E8aGNJNdoexXAfKTLyvt4HSfpZ1YgeGAgpnQhcXPSGpD)] {_bn: <BN: c3189bc7272634899ebd0aa905f09b159c2e93b72a072834289ee65a9b141196>}
    //console.log('the authorityPublicKey is: ', authorityPublicKey.toBase58())  //  E8aGNJNdoexXAfKTLyvt4HSfpZ1YgeGAgpnQhcXPSGpD

    const tree = new PublicKey("ERkzt2Zyau5nnSf877FCQNzQRRxW5xaMJEt4DQhYX97T");

    const collectionMint = new PublicKey("3XfkDtSZZ586DztsjeVpTV3TLMYHRci2tkwTBoGzFvfz");

    // Build Transaction
    const ix = await createMintCNFTInstruction(tree, collectionMint, user, authority.publicKey);
    console.log('ix.data: ', ix.data)
    //console.log('ix.keys: ', ix.keys)
    //console.log('ix.programId: ', ix.programId) //PublicKey [PublicKey(BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY)] {_bn: <BN: 988b80eb79352869b224745f59ddbf8a2658ca13dc68812126351cae07c1a5a5>}

    let transaction = new Transaction();
    transaction.add(ix);

    const connection = new Connection('https://api.devnet.solana.com')
    const bh = await connection.getLatestBlockhash();
    transaction.recentBlockhash = bh.blockhash;
    transaction.feePayer = authority.publicKey     // user; -> The authority pay for the transaction fee. It could be the variable 'user' also if I want.

    // for correct account ordering 
    transaction = Transaction.from(transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    }));

    transaction.sign(authority);
    //console.log('the transaction.signature: ', transaction.signatures)


    // Serialize and return the unsigned transaction.
    const serializedTransaction = transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');
    const message = 'Thank you for minting with SolRitchB!';

    res.status(200).send({ transaction: base64Transaction, message });

}





export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetData | PostData>
) {
    if (req.method == "GET") {
        return get(req, res);
    } else if (req.method == "POST") {
        return await post(req, res);
    }
}







async function createMintCNFTInstruction(merkleTree: PublicKey, collectionMint: PublicKey, user: PublicKey, authority: PublicKey) {

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [merkleTree.toBuffer()],
        BUBBLEGUM_PROGRAM_ID,
    );

    //console.log('the treeAuthority is: ', treeAuthority.toBase58())//BYcDWRYDZsCQeU9Ew82PG5Gnkxkq2b9N8GWeorN5gdeU
    //console.log('the _bump is: ', _bump)    //255
    //console.log('the merkleTree is: ', merkleTree.toBase58())   //ERkzt2Zyau5nnSf877FCQNzQRRxW5xaMJEt4DQhYX97T
    //console.log('the collectionMint is: ', collectionMint.toBase58())   //3XfkDtSZZ586DztsjeVpTV3TLMYHRci2tkwTBoGzFvfz


    const [collectionMetadataAccount, _b1] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata", "utf8"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    //console.log('the collectionMetadataAccount is: ', collectionMetadataAccount.toBase58())   // G8pq8JmbVTzktGjkfeV7EB8VoU5mRZXt4spCs2PRm4Xg
    //console.log('the _b1 is: ', _b1)  // 255
    //console.log('the TOKEN_METADATA_PROGRAM_ID is: ', TOKEN_METADATA_PROGRAM_ID.toBase58())  //metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
    //console.log('the collectionMint.toBuffer(): ', collectionMint.toBuffer()) //<Buffer 25 92 ... e9>

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

    const tix = await createMintToCollectionV1Instruction({
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
            name: "Les castors",
            primarySaleHappened: true,
            sellerFeeBasisPoints: 0,
            symbol: "CAS",
            uri: "https://shdw-drive.genesysgo.net/BBayKe9v2acgiM6LpEio9dA1nxHHg2S6UsYrZuTVxZZL/cNFTrb_metadata.json",
            uses: null,
            tokenStandard: TokenStandard.NonFungible,
            editionNonce: null,
            tokenProgramVersion: TokenProgramVersion.Original
        }
    });

    return tix;


}
