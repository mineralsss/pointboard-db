const express = require("express");
const router = express.Router();
const userRouter = require("./user.route");
const authRouter = require("./auth.route");
const paymentRouter = require("./payment.route");
const orderRouter = require("./order.route");
const productRouter = require("./product.route");

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
  {
    path: "/orders",
    route: orderRouter,
  },
  {
    path: "/products",
    route: productRouter,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});
module.exports = router;
