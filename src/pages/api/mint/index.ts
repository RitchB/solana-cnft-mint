// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    console.log("ERROR: please specify mint tag!");
    res.status(404).send({});
//   if(req.method == "GET"){
//     console.log("received GET request");
//     return get(req, res);
//   } else if(req.method == "POST"){
//     console.log("received POST request");
//     console.log("ERROR: please specify mint tag!");
//     res.status(404);
//   }
}




