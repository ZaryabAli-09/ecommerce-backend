import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function addToCartItems(req, res, next) {
  try {
    const { productId, variantId } = req.params;

    if (!productId || !variantId) {
      throw new ApiError(400, "Product Id and Variant Id are required.");
    }

    let buyer = req.buyer;
    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    // check if variant exist in above product we find
    const variant = product.variants.id(variantId);
    if (!variant) {
      throw new ApiError(404, "Variant not found.");
    }

    // Check stock availability
    if (variant.stock <= 0) {
      throw new ApiError(400, "This variant is out of stock.");
    }

    // check if already in cart
    const itemExists = buyer.cart.find((item) => {
      return (
        item.product.toString() === productId &&
        item.variant.toString() === variantId
      );
    });

    // if al ready in cart then increment its quantityy only
    if (itemExists) {
      if (itemExists.quantity >= 3) {
        throw new ApiError(400, "Cannot exceed quantity from 3.");
      }
      if (itemExists.quantity >= variant.stock) {
        throw new ApiError(400, "Cannot add more than available stock.");
      }
      itemExists.quantity += 1;

      // else directly add to cart
    } else {
      buyer.cart?.push({
        product: productId,
        variant: variantId,
        quantity: 1,
      });
    }

    // saving....
    await buyer.save();

    res.status(200).json(new ApiResponse(null, "Item added to cart."));
  } catch (error) {
    next(error);
  }
}
// Get Cart Items Controller
async function getCartItems(req, res, next) {
  try {
    // credenetials must include as this controller will get buyer from token
    let buyer = req.buyer;

    // Validate buyer
    if (!buyer || !mongoose.Types.ObjectId.isValid(buyer._id)) {
      throw new ApiError(400, "Invalid buyer data.");
    }

    // Check for empty cart
    if (!buyer.cart || buyer.cart.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse({ cart: [] }, "Cart is empty"));
    }

    // populate the response
    buyer = await buyer.populate({
      path: "cart.product",
      select: "name seller variants",
      populate: [
        {
          path: "seller",
          select: "name",
        },
        {
          path: "variants",
          select: "size color price discountedPrice stock images",
        },
      ],
    });

    // Format cart items
    // it will only format/structure the response nothing else
    const formattedCart = buyer.cart
      .map((item) => {
        const variant =
          item.product?.variants?.find(
            (v) => v?._id?.toString() === item.variant?.toString()
          ) || null;

        return {
          _id: item._id,
          product: item.product
            ? {
                _id: item.product._id,
                name: item.product.name,
                seller: item.product.seller,
              }
            : null,
          variant,
          quantity: item.quantity,
        };
      })
      .filter((item) => item.product && item.variant); // if there is cart which misses product or variant id then it will be filtered out simply
    res
      .status(200)
      .json(
        new ApiResponse(
          { cart: formattedCart },
          "Cart items retrieved successfully."
        )
      );
  } catch (error) {
    console.error("Error in getCartItems:", error);
    next(error);
  }
}
async function updateCart(req, res, next) {
  try {
    const { cartId, quantity } = req.body;

    if (!cartId || !quantity) {
      throw new ApiError(400, "Cart item details are required for updating.");
    }

    if (quantity < 1 || quantity > 3) {
      throw new ApiError(400, "Quantity must be between 1 and 3.");
    }

    let buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    const cartItemIndex = buyer.cart.findIndex(
      (item) => item._id.toString() === cartId
    );

    if (cartItemIndex === -1) {
      throw new ApiError(404, "Cart item not found.");
    }

    // Get product and variant to check stock
    const cartItem = buyer.cart[cartItemIndex];
    const product = await Product.findById(cartItem.product);
    const variant = product.variants.id(cartItem.variant);

    if (!variant) {
      throw new ApiError(404, "Variant not found.");
    }

    if (quantity > variant.stock) {
      throw new ApiError(
        400,
        "Cannot update quantity to more than available stock."
      );
    }

    buyer.cart[cartItemIndex].quantity = quantity;

    await buyer.save();

    buyer = await buyer.populate({
      path: "cart.product",
      select: "name variants",
      populate: {
        path: "variants",
        select: "size color price discountedPrice stock images",
      },
    });

    const totalQuantity = buyer.cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const totalAmount = buyer.cart.reduce((sum, item) => {
      const variant = item.product.variants.find(
        (v) => v._id.toString() === item.variant.toString()
      );
      const price = variant.discountedPrice || variant.price;
      return sum + item.quantity * price;
    }, 0);

    res
      .status(200)
      .json(
        new ApiResponse(
          { cart: buyer.cart, totalQuantity, totalAmount },
          "Cart successfully updated."
        )
      );
  } catch (error) {
    next(error);
  }
}
async function removeFromCart(req, res, next) {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      throw new ApiError(400, "Cart Id not found.");
    }

    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer.cart = buyer.cart?.filter((item) => item._id.toString() !== cartId);

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
