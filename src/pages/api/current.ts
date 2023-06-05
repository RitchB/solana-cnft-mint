// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { NextApiRequest, NextApiResponse } from "next";
import { CnftInfo } from "./mint/[cnfttag]";


type GetData = {
  enabled: boolean,
  title?: string,
  image?: string,
  end?: string,
}



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetData>
) {
  res.appendHeader('Access-Control-Allow-Origin', '*');
  res.appendHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  const info = getCurrentInfo();
  if(!info){
    res.status(200).send({
        enabled: false
    });
  }

  // todo: date checks

  res.status(200).send({
    enabled: true,
    title: info.name,
    image: info.image
  });
}

function getCurrentInfo(): CnftInfo | null {
  const infodict = require('../../data/cnfts.json')
  for (const [cnfttag, info] of Object.entries(infodict)){
    const typedinfo = info as CnftInfo
    if(typedinfo.current){
      return info as CnftInfo;
    }
  }
  return null;
}




