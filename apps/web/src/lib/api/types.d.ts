export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<TData = unknown, TMeta = unknown> =
  | {
      ok: true;
      data: TData;
      meta: TMeta | null;
      error: null;
    }
  | {
      ok: false;
      data: null;
      meta: TMeta | null;
      error: ApiError;
    };
