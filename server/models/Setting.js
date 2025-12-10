const Setting = (sequelize, DataTypes) => {
    const Setting = sequelize.define('Setting', {
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        value: {
            type: DataTypes.STRING, // Store as string to be flexible (e.g., '100', 'true', 'some text')
            allowNull: false,
        },
    });

    return Setting;
};

module.exports = Setting;
