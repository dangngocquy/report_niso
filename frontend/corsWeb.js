module.exports = (req, res, next) => {
    // console.log("headers",req.headers)
    let https = "*"
    if (req.headers && req.headers.referer) {
        https = req.headers.referer.replace(/\/$/, "")
    }
    // https=https.replace('www.','')
    // console.log("https",https)
    res.header("Access-Control-Allow-Origin", https); //The ionic server
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "action,authorization,content-type,controller");
    res.header("Access-Control-Expose-Headers", "Content-Length,Authorization");
    if (req.method.toUpperCase() == "OPTIONS") {
        return res.status(204).send()
    } else {
        next();
    }
  }