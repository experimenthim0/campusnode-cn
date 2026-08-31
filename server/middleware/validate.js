import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid ID format');

export const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // read-only getters, so assigning to them throws TypeError.
    if (validData.body) req.body = validData.body;
    next();
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }
    next(error);
  }
};
