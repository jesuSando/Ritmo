const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const app = express();

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);


const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [];

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) return callback(null, true);

            if (!allowedOrigins.includes(origin)) {
                console.warn(`CORS blocked origin: ${origin}`);
                return callback(null, false);
            }

            return callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.use("/api", require("./routes"));

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    res.status(err.status || 500).json({
        success: false,
        error:
            process.env.NODE_ENV === "production"
                ? "Internal server error"
                : err.message
    });
});

module.exports = app;
