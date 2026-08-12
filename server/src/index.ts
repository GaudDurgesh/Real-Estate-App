import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authMiddleware } from "./middleware/authMiddleware";

/* ROUTES IMPORT */
import tenantRoutes from "./routes/tenantRoute";
import managerRoutes from "./routes/managerRoute";


/*CONFIGURATION */

dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/*ROUTES */

app.get("/",  (req, res) => {
  res.send("This is home route");
});


app.use("/tenants", authMiddleware(["tenant"]),tenantRoutes)
app.use("/managers", authMiddleware(["manager"]),managerRoutes)

/* SERVER */

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


// import { router } from "./routes";
