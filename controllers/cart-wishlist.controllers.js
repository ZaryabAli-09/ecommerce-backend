import { User } from "../models/user.model.js";

async function addToCartItems(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        message: "Product id not found",
      });
    }

    let user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "User is not logged in",
      });
    }

    const itemExists = user.cart.find((item) => {
      return item.product.toString() === productId;
    });

    if (itemExists) {
      if (itemExists.quantity >= 3) {
        return res.status(400).json({
          message: "Cannot exceed quantity from 3",
        });
      }
      itemExists.quantity += 1;
    } else {
      user.cart?.push({ product: productId, quantity: 1 });
    }

    user = await user.populate({
      path: "cart.product", // Specify the field to populate (cart.product)
      select: "name price images", // Select the fields you want from the Product model
    });

    await user.save();

    const totalQuantity = user.cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalAmount = user.cart.reduce(
      (sum, item) => sum + item.quantity * item.product.price,
      0
    );
    return res.status(201).json({
      message: "Item added to cart",
      cart: user.cart,
      totalQuantity,
      totalAmount,
    });
  } catch (error) {
    next(error);
  }
}

// Sync cart from Redux Persist to database on login
async function syncCartItems(req, res, next) {
  const { localCart } = req.body; // Cart from the frontend (unauthenticated user's cart)
  const userId = req.user.id; // Assuming user ID is available in req.user after authentication middleware

  console.log(localCart);
  if (!localCart || !Array.isArray(localCart)) {
    return res.status(400).json({ message: "Invalid cart data" });
  }

  try {
    const user = await User.findById(userId).populate("cart.product");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sync logic
    const updatedCart = [...user.cart]; // Clone existing user cart

    localCart.forEach((localItem) => {
      const productIndex = updatedCart.findIndex(
        (item) => item.product.toString() === localItem.product._id
      );

      if (productIndex !== -1) {
        // Product exists in the user's cart; update the quantity
        updatedCart[productIndex].quantity = Math.min(
          3,
          updatedCart[productIndex].quantity + localItem.quantity
        );
      } else {
        // Product does not exist; add it to the cart
        updatedCart.push({
          product: localItem.product._id,
          quantity: Math.min(3, localItem.quantity),
        });
      }
    });

    // Save updated cart
    user.cart = updatedCart;
    await user.save();

    return res.status(200).json({
      message: "Cart synchronized successfully",
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
}
async function getCartItems(req, res, next) {
  try {
    let user = req.user;

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Populate the "cart.product" field to include product details
    user = await user.populate({
      path: "cart.product", // Specify the field to populate (cart.product)
      select: "name price images", // Select the fields you want from the Product model
    });

    // Now user.cart will contain product details populated within each cart item
    res.status(200).json({
      message: "Cart items retrieved successfully",
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCart(req, res, next) {
  try {
    const { cartItems } = req.body; // cartItems is an array of { productId, quantity }

    if (!cartItems || !cartItems.length) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "User is not logged in" });
    }

    user.cart = cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }));

    await user.save();

    return res.json({ message: "Cart updated successfully" });
  } catch (error) {
    next(error);
  }
}
async function removeFromCart(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        message: "Product id not found",
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "User is not logged in",
      });
    }

    user.cart = user.cart?.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    return res.status(200).json({
      message: "Item remove from cart",
    });
  } catch (error) {
    next(error);
  }
}
async function addIItemToWishlist(req, res, next) {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({
        message: "Product id not found",
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "User is not logged in",
      });
    }

    // Check if product is already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        message: "Item already in wishlist",
      });
    }

    user.wishlist.push(productId);
    await user.save();

    return res.status(201).json({
      message: "Item added to wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
}

async function getWishList(req, res, next) {
  try {
    let user = req.user;
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    user = await user.populate("wishlist");
    res.status(200).json({
      message: "Wishlist retrieved successfully",
      wishlist: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
}

async function removeFromWhislist(req, res, next) {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({
        message: "Product id not found",
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "User is not logged in",
      });
    }

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);

    await user.save();

    return res.status(200).json({
      message: "Item remove from wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
}

export {
  addToCartItems,
  removeFromCart,
  updateCart,
  addIItemToWishlist,
  removeFromWhislist,
  getWishList,
  getCartItems,
  syncCartItems,
};
