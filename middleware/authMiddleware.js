
import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is missing.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Your JWT stores the user ID in the "sub" field.
    const userId = decoded.sub || decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in authentication token.",
      });
    }

    req.user = {
      ...decoded,
      id: userId,
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error.name);

    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }
}
