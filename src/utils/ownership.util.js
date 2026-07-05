function isOwnerOrAdmin(user, resourceOwnerId) {
  return user && (user.id === resourceOwnerId || user.role === 'ADMIN');
}

module.exports = { isOwnerOrAdmin };