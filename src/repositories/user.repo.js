const User = require("../models/user.model");

class UserRepository {
  async getByEmail(email) {
    return await User.findOne({ email });
  }

  async getAll(filter = {}, options = {}) {
    const {
      sortBy = "createdAt",
      limit = 20,
      page = 1,
      q = "",
      allowSearchFields = [],
    } = options;

    let query = { ...filter };

    if (q && allowSearchFields.length > 0) {
      const searchConditions = allowSearchFields.map((field) => ({
        [field]: { $regex: q, $options: "i" },
      }));
      query.$or = searchConditions;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .sort({ [sortBy]: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new UserRepository();
