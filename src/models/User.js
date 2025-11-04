const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.VIRTUAL,
        validate: {
            notEmpty: true,
            len: [6, 100]
        }
    }
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.passwordHash = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.passwordHash = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

User.prototype.verifyPassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.password;
    return values;
};



User.associate = function (models) {
    User.hasMany(models.Task, { foreignKey: 'userId' });
    User.hasMany(models.Routine, { foreignKey: 'userId' });
    User.hasMany(models.TimeBlock, { foreignKey: 'userId' });
};

module.exports = User;