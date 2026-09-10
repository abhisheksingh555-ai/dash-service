import express from "express";
import {
  getFundamentals,
  getPortfolio,
  getQuotes
} from "../controllers/portfolio.controller.js";

const router = express.Router();

router.get("/", getPortfolio);
router.get("/quotes", getQuotes);
router.get("/fundamentals", getFundamentals);

export default router;
