import "dotenv/config";
import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { checkDbConnection } from "./db/client";
import errorMiddleware from "./middlewares/ErrorMiddleware";
import router from "./router";
import { registerBoardWebSocket } from "./ws/boardCollaboration";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/api", router);
app.use(errorMiddleware);

const server = http.createServer(app);
registerBoardWebSocket(server);

const start = async () => {
  try {
    await checkDbConnection();
    server.listen(process.env.PORT, () =>
      console.log(`Server is running on port ${process.env.PORT}`),
    );
  } catch (e) {
    console.log(e);
  }
};

start();
