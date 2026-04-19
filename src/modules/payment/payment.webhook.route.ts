import { Router } from "express";

import { shurjoPayIpnHandler, sslCommerzIpnHandler } from "./payment.webhook.controller";

const router = Router();

router.post("/sslcommerz", sslCommerzIpnHandler);
router.post("/shurjopay", shurjoPayIpnHandler);

export default router;
