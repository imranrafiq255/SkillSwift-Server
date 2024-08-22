const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const adminSchema = mongoose.Schema(
  {
    adminFullName: {
      type: String,
      required: [true, "admin full name is required"],
    },
    adminEmail: {
      type: String,
      unique: [true, "admin email should be unique"],
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "email is not valid",
      },
      required: [true, "admin email is required"],
    },
    adminPassword: {
      type: String,
      minlength: [8, "admin password should be greater than or equal to 8"],
      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
        },
        message: (props) => {
          if (!/(?=.*[a-z])/.test(props.value))
            return "Password must contain at least one lowercase letter";
          if (!/(?=.*[A-Z])/.test(props.value))
            return "Password must contain at least one uppercase letter";
          if (!/(?=.*\d)/.test(props.value))
            return "Password must contain at least one number";
          if (!/(?=.*[\W_])/.test(props.value))
            return "Password must contain at least one special character";
          return "Invalid password";
        },
      },
      required: [true, "admin password is required"],
      select: false,
    },
    adminAvatar: String,
    adminPhoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[+]*\d{12}/.test(v);
        },
        message:
          "phone number should be a valid 12-digit number (+92xxxxxxxxxx)",
      },
    },
    adminTokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("adminPassword")) return next();
    this.adminPassword = await bcrypt.hash(this.adminPassword, 10);
    next();
  } catch (error) {
    next(error);
  }
});

const adminModel = mongoose.model("Admin", adminSchema);
module.exports = adminModel;
