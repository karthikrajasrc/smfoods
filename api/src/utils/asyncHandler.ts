import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(controller: AsyncController): RequestHandler {
  return (req, res, next) => {
    void controller(req, res, next).catch(next);
  };
}
