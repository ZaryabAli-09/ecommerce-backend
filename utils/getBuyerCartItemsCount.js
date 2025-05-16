function getBuyerCartItemsCount(cartItems) {
  let count = 0;

  cartItems.forEach((cartItem) => {
    count += cartItem.quantity;
  });

  return count;
}

export default getBuyerCartItemsCount;
