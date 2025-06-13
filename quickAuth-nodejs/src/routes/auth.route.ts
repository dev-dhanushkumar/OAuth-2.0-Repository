import express from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
} from "../controllers/auth.controller";
import { deserializeUser } from "../middleware/deserializeUser";
import { requireUser } from "../middleware/requireUser";
import { validate } from "../middleware/validate";
import { createUserSchema, forgotPasswordSchema, loginUserSchema, resetPasswordSchema } from "../schema/user.schema";

const router = express.Router();

router.post("/register", validate(createUserSchema), registerHandler);
router.post("/login", validate(loginUserSchema), loginHandler);
router.get("/logout", deserializeUser, requireUser, logoutHandler);
router.post("/forgotpassword", validate(forgotPasswordSchema), forgotPasswordHandler);
router.patch("/resetpassword/:passwordResetToken", validate(resetPasswordSchema), resetPasswordHandler); 

export default router;
