const mssql = require('mssql');
const config = require('./sql');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function verifySignature(data, signature, publicKeyPath) {
  try {
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    
    console.log('Dữ liệu xác minh:', data);
    console.log('Chữ ký:', signature);

    const isValid = verify.verify(publicKey, signature, 'base64');
    
    console.log('Kết quả xác minh chữ ký:', isValid ? 'THÀNH CÔNG' : 'THẤT BẠI');
    
    return isValid;
  } catch (error) {
    console.error('Lỗi xác minh chữ ký:', error);
    return false;
  }
}

function signData(data, privateKeyPath) {
  try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    
    const signature = sign.sign(privateKey, 'base64');
    
    return signature;
  } catch (error) {
    console.error('Lỗi ký dữ liệu:', error);
    return null;
  }
}

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

exports.postLoginUser = async (req, res) => {
  const { username, password, clientSignature } = req.body;

  try {
    await mssql.connect(config);

    const result = await mssql.query`
        SELECT keys, name, phanquyen, username, password 
        FROM databaseAccount 
        WHERE username = ${username} AND password = ${password}
    `;

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      
      const privateKeyPath = path.resolve(__dirname, '../SSL/private_key.pem');
      const dataToSign = [username, password].join('');
      const serverSignature = signData(dataToSign, privateKeyPath);
      
      if (clientSignature === serverSignature) {
        const hashedPassword = hashPassword(password);
        console.log('Mã hóa password =>', hashedPassword);
        
        return res.json({ 
          keys: user.keys, 
          name: user.name, 
          phanquyen: user.phanquyen, 
          username: user.username,
          signature: serverSignature 
        });
      } else {
        console.log('=== PHÁT HIỆN TRUY CẬP CHỮ KÝ KHÔNG HỢP LỆ ===');
        console.log('Thời gian:', new Date().toLocaleString());
        console.log('Username:', username);
        console.log('Client SSL:', clientSignature);
        console.log('Server SSL:', serverSignature);
        console.log('=====================================');
        
        return res.status(403).json({ 
          message: 'Xác thực SSL không hợp lệ',
          blocked: true 
        });
      }
    } else {
      return res.status(401).json({ 
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác' 
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  } finally {
    await mssql.close();
  }
};
