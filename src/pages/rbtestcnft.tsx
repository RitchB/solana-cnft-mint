import type { NextPage } from "next";
import Head from "next/head";
import { RbtestcnftView } from "../views";

const Rbtestcnft: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta
          name="description"
          content="Solana Scaffold"
        />
      </Head>
      <RbtestcnftView />
    </div>
  );
};

export default Rbtestcnft;
