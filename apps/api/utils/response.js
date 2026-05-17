const buildOk = (data, meta = null) => ({
  ok: true,
  data,
  meta,
  error: null,
});

const buildError = (code, message, meta = null) => ({
  ok: false,
  data: null,
  meta,
  error: { code, message },
});

const sendOk = (res, data, meta = null, status = 200) => {
  return res.status(status).json(buildOk(data, meta));
};

const sendError = (res, code, message, status = 400, meta = null) => {
  return res.status(status).json(buildError(code, message, meta));
};

const ok = (res, data, meta = null, status = 200) => sendOk(res, data, meta, status);
const fail = (res, status, code, message, meta = null) =>
  sendError(res, code, message, status, meta);

module.exports = {
  buildOk,
  buildError,
  sendOk,
  sendError,
  ok,
  fail,
};
