import type { NextFunction, Request, Response } from "express";

type AsyncRouteFn<Req extends Request, Res extends Response> = (
  req: Req,
  res: Res,
  next: NextFunction,
) => Promise<unknown> | unknown;

export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
  fn: AsyncRouteFn<Req, Res>,
): (req: Req, res: Res, next: NextFunction) => void {
  return (req: Req, res: Res, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
