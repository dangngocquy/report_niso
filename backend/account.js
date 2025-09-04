const mssql = require('mssql');
const config = require('./sql');
const crypto = require('crypto');

const pool = new mssql.ConnectionPool(config);
const poolConnect = pool.connect();

function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
}

exports.getusersAccount = async (req, res) => {
    try {
        await poolConnect;
        const result = await pool.request().query`SELECT * FROM databaseAccount;`;

        const docs = result.recordsets[0];

        res.json({ docs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getusersAccountID = async (req, res) => {
    const { keys } = req.params;

    try {
        await poolConnect;

        const result = await pool
            .request()
            .input('keys', mssql.UniqueIdentifier, keys)
            .query('SELECT * FROM databaseAccount WHERE keys = @keys');

        if (result.recordset.length > 0) {
            const admin = result.recordset[0];
            res.json(admin);
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.postusersAccount = async (req, res) => {
    const { name, username, password, phanquyen } = req.body;

    try {
        await poolConnect;

        const hashedPassword = hashPassword(password);
        const newId = await pool.request().query('SELECT NEWID() as newId');
        const keys = newId.recordset[0].newId;

        await pool
            .request()
            .input('keys', mssql.UniqueIdentifier, keys)
            .input('name', mssql.NVarChar, name)
            .input('username', mssql.NVarChar, username)
            .input('password', mssql.NVarChar, hashedPassword)
            .input('phanquyen', mssql.Bit, phanquyen) 
            .query(`
                INSERT INTO databaseAccount (keys, name, username, password, phanquyen) 
                VALUES (@keys, @name, @username, @password, @phanquyen);
                
                SELECT * FROM databaseAccount WHERE keys = @keys;
            `);

        const result = await pool
            .request()
            .input('keys', mssql.UniqueIdentifier, keys)
            .query('SELECT * FROM databaseAccount WHERE keys = @keys');

        const newUser = result.recordset[0];
        
        if (!newUser) {
            throw new Error('Failed to create new user');
        }

        res.json(newUser);
    } catch (error) {
        console.error('Error in postusersAccount:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};


exports.putusersAccount = async (req, res) => {
    const { password, username, name, phanquyen } = req.body;
    const { keys } = req.params;

    try {
        await poolConnect;

        const hashedPassword = hashPassword(password);

        await pool
            .request()
            .input('password', mssql.NVarChar, hashedPassword)
            .input('username', mssql.NVarChar, username)
            .input('name', mssql.NVarChar, name)
            .input('phanquyen', mssql.Bit, phanquyen) 
            .input('keys', mssql.UniqueIdentifier, keys)
            .query(`
                UPDATE databaseAccount 
                SET password = @password, 
                    username = @username, 
                    name = @name, 
                    phanquyen = @phanquyen 
                WHERE keys = @keys;
                
                SELECT * FROM databaseAccount WHERE keys = @keys;
            `);

        const result = await pool
            .request()
            .input('keys', mssql.UniqueIdentifier, keys)
            .query('SELECT * FROM databaseAccount WHERE keys = @keys');

        const updatedUser = result.recordset[0];
        
        if (!updatedUser) {
            throw new Error('Failed to update user');
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in putusersAccount:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

exports.deleteusersAccount = async (req, res) => {
    const { keys } = req.params;

    try {
        await poolConnect;

        const result = await pool
            .request()
            .input('keys', mssql.UniqueIdentifier, keys)
            .query('DELETE FROM databaseAccount WHERE keys = @keys');

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

