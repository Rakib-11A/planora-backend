import { Router } from "express";

import {
  shurjoPayIpnHandler,
  sslCommerzIpnHandler,
  sslCommerzReturnHandler,
} from "./payment.webhook.controller";

const router = Router();

router.post("/sslcommerz", sslCommerzIpnHandler);
// Customer redirect from SSLCommerz gateway — POST (gateway auto-submit) or GET (browser back).
router.post("/sslcommerz/return/:status", sslCommerzReturnHandler);
router.get("/sslcommerz/return/:status", sslCommerzReturnHandler);
router.post("/shurjopay", shurjoPayIpnHandler);

export default router;
