class SuccessResponse {
  constructor({ message, status = 200, data = {}, options = {} }) {
    this.message = message;
    this.status = status;
    this.data = data;
    this.options = options;
  }

  send(res, headers = {}) {
    return res.status(this.status).json(this);
  }
}

class Ok extends SuccessResponse {
  constructor({ message, data = {}, options = {} }) {
    super({ message, data, options });
  }
}

class Create extends SuccessResponse {
  constructor({ message, data = {}, options = {} }) {
    super({ message, status: 201, data, options });
  }
}

const CREATED = (res, message, data = null) => {
  return res.status(201).json({
    success: true,
    statusCode: 201,
    message,
    data,
  });
};

const OK = (res, message, data = null) => {
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message,
    data,
  });
};
const BAD_REQUEST = (res, message, data = null) => {
  return res.status(400).json({
    success: false,
    statusCode: 400,
    message,
    data,
  });
};

module.exports = {
  OK,
  CREATED,
  BAD_REQUEST,
};
