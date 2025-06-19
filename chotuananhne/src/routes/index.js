const express = require("express");
const router = express.Router();
const userRouter = require("./user.route");
const authRouter = require("./auth.route");
const paymentRouter = require("./payment.route");

const routes = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/users",
    route: userRouter,
  },
  {
    path: "/payments",
    route: paymentRouter,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});
module.exports = router;
