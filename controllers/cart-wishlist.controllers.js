import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function addToCartItems(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, "Product Id not found.");
    }

    let buyer = req.buyer;
    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    const itemExists = buyer.cart.find((item) => {
      return item.product.toString() === productId;
    });

    if (itemExists) {
      if (itemExists.quantity >= 3) {
        throw new ApiError(400, "Cannot exceed quantity from 3.");
      }
      itemExists.quantity += 1;
    } else {
      buyer.cart?.push({ product: productId, quantity: 1 });
    }

    buyer = await buyer.populate({
      path: "cart.product",
      select: "name price images",
    });

    await buyer.save();

    const totalQuantity = buyer.cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalAmount = buyer.cart.reduce(
      (sum, item) => sum + item.quantity * item.product.price,
      0
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          { cart: buyer.cart, totalQuantity, totalAmount },
          "Item added to cart."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getCartItems(req, res, next) {
  try {
    let buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer = await buyer.populate({
      path: "cart.product",
      select: "name price images",
    });

    res
      .status(200)
      .json(new ApiResponse(buyer.cart, "Cart items retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function updateCart(req, res, next) {
  try {
    const { cartItems } = req.body;

    if (!cartItems || !cartItems.length) {
      throw new ApiError(400, "Cart items are required.");
    }

    let buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer.cart = cartItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    buyer = await buyer.populate({
      path: "cart.product",
      select: "name price images",
    });

    await buyer.save();

    res
      .status(200)
      .json(new ApiResponse(buyer.cart, "Cart updated successfully."));
  } catch (error) {
    next(error);
  }
}

async function removeFromCart(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, "Product Id not found.");
    }

    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer.cart = buyer.cart?.filter(
      (item) => item.product.toString() !== productId
    );

    await buyer.save();

    res
      .status(200)
      .json(new ApiResponse(buyer.cart, "Item removed from cart."));
  } catch (error) {
    next(error);
  }
}

async function addIItemToWishlist(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, "Product Id not found.");
    }

    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    if (buyer.wishlist.includes(productId)) {
      throw new ApiError(400, "Item already in wishlist.");
    }

    buyer.wishlist.push(productId);
    await buyer.save();

    res
      .status(201)
      .json(new ApiResponse(buyer.wishlist, "Item added to wishlist."));
  } catch (error) {
    next(error);
  }
}

async function getWishList(req, res, next) {
  try {
    let buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer = await buyer.populate("wishlist");

    res
      .status(200)
      .json(
        new ApiResponse(buyer.wishlist, "Wishlist retrieved successfully.")
      );
  } catch (error) {
    next(error);
  }
}

async function removeFromWhislist(req, res, next) {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, "Product Id not found.");
    }

    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer.wishlist = buyer.wishlist.filter((id) => id.toString() !== productId);

    await buyer.save();

    res
      .status(200)
      .json(new ApiResponse(buyer.wishlist, "Item removed from wishlist."));
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
};
