const responseJSON = (res, successBool, data, codeMessage, errCode) => {
    payload = {
        success: successBool,
        data: data,
        message: codeMessage
    }
    res.status(errCode).json(payload);
}

module.exports = { responseJSON };