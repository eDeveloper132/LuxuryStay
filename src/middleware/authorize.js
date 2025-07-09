// roles array pass karen, jo roles allow hain
export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Access mana kiya gaya' });
        }
        next();
    };
};
