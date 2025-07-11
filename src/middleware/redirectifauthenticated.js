import jwt from 'jsonwebtoken';
export const redirectIfAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            // Token valid hai, dashboard pe bhej do
            return res.redirect('/');
        }
        catch {
            // Invalid token — allow to continue to login/signup
        }
    }
    next();
};
