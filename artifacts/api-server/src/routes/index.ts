import { Router, type IRouter } from "express";
import healthRouter from "./health";
import artworksRouter from "./artworks";
import locationsRouter from "./locations";
import loansRouter from "./loans";
import goalsRouter from "./goals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(artworksRouter);
router.use(locationsRouter);
router.use(loansRouter);
router.use(goalsRouter);

export default router;
