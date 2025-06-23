import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import getBuyerCartItemsCount from "../utils/getBuyerCartItemsCount.js";
import { Buyer } from "../models/buyer.models.js";

async function addToCartItems(req, res, next) {
  try {
    const { productId, variantId } = req.params;

    if (!productId || !variantId) {
      console.log("Product Id and Variant Id are required.");
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
      } else if (itemExists.quantity >= variant.stock) {
        throw new ApiError(400, "Cannot add more than available stock.");
      } else {
        itemExists.quantity += 1;
        await buyer.save();
        return res
          .status(200)
          .json(
            new ApiResponse(
              { cartItemsCount: getBuyerCartItemsCount(buyer.cart) },
              `Product Quantity increased to ${itemExists.quantity}.`
            )
          );
      }

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

    res
      .status(200)
      .json(
        new ApiResponse(
          { cartItemsCount: getBuyerCartItemsCount(buyer.cart) },
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

    // Populate the cart items with product and variant data
    buyer = await buyer.populate({
      path: "cart.product",
      select: "name seller variants",
      populate: [
        {
          path: "seller",
          select: "brandName",
        },
        {
          path: "variants",
          select: "size color price discountedPrice stock images",
        },
      ],
    });

    // Identify invalid items to remove and format valid items
    const itemsToRemove = [];
    const formattedCart = buyer.cart
      .map((item) => {
        const product = item.product;
        const variant = product?.variants?.find(
          (v) => v?._id?.toString() === item.variant?.toString()
        );

        // Check if product or variant is missing
        if (!product || !variant) {
          itemsToRemove.push(item._id);
          return null;
        }

        return {
          _id: item._id,
          product: {
            _id: product._id,
            name: product.name,
            seller: product.seller,
          },
          variant,
          quantity: item.quantity,
        };
      })
      .filter(Boolean); // Remove null entries

    // Remove invalid items from database if any were found
    if (itemsToRemove.length > 0) {
      await Buyer.updateOne(
        { _id: buyer._id },
        { $pull: { cart: { _id: { $in: itemsToRemove } } } }
      );
    }

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
// (to zaryab) I am using addToCartItems controller above to increment the qunatity of an item in cart and this one is specifically to decrement the quantity of an item in cart, I modified it, its name, its code
async function decrementCartItemQuantity(req, res, next) {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      throw new ApiError(400, "Cart item details are required for updating.");
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

    if (buyer.cart[cartItemIndex].quantity === 1) {
      throw new ApiError(404, "Product quantity cannot be less than 1.");
    }

    buyer.cart[cartItemIndex].quantity -= 1;

    await buyer.save();

    buyer = await buyer.populate({
      path: "cart.product",
      select: "name variants",
      populate: {
        path: "variants",
        select: "size color price discountedPrice stock images",
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          { cartItemsCount: getBuyerCartItemsCount(buyer.cart) },
          `Product quantity decreased to ${buyer.cart[cartItemIndex].quantity}`
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
      .json(
        new ApiResponse(
          { cartItemsCount: getBuyerCartItemsCount(buyer.cart) },
          "Item removed from cart."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function addIItemToWishlist(req, res, next) {
  try {
    const { productId, variantId } = req.params;

    if (!productId || !variantId) {
      console.log("Product Id and Variant Id are required.");
      throw new ApiError(400, "Product Id and Variant Id are required.");
    }

    let buyer = req.buyer;
    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    // check if already in wishlist
    const itemExists = buyer.wishlist.find((item) => {
      return (
        item.product.toString() === productId &&
        item.variant.toString() === variantId
      );
    });

    if (itemExists) {
      throw new ApiError(400, "Item already in wishlist.");
    }

    buyer.wishlist.push({
      product: productId,
      variant: variantId,
    });

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
    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    // First populate the product references
    await buyer.populate({
      path: "wishlist.product",
      select: "name rating numReviews reviews variants",
    });

    // Identify invalid items
    const validItems = [];
    const invalidItemIds = [];

    buyer.wishlist.forEach((item) => {
      const product = item.product;
      if (!product) {
        invalidItemIds.push(item._id);
        return;
      }

      const variantExists = product.variants.some(
        (v) =>
          v._id && item.variant && v._id.toString() === item.variant.toString()
      );

      if (!variantExists) {
        invalidItemIds.push(item._id);
      } else {
        validItems.push(item);
      }
    });

    // Remove invalid items from database if any were found
    if (invalidItemIds.length > 0) {
      await Buyer.updateOne(
        { _id: buyer._id },
        { $pull: { wishlist: { _id: { $in: invalidItemIds } } } }
      );
    }

    // Prepare the response with only valid items
    const wishlistResponse = validItems.map((item) => ({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        rating: item.product.rating,
        numReviews: item.product.numReviews,
        reviews: item.product.reviews,
      },
      variant: item.product.variants.find(
        (v) => v._id.toString() === item.variant.toString()
      ),
    }));

    res
      .status(200)
      .json(
        new ApiResponse(wishlistResponse, "Wishlist retrieved successfully.")
      );
  } catch (error) {
    next(error);
  }
}

async function removeFromWhislist(req, res, next) {
  try {
    const { productId, variantId } = req.params;

    if (!productId || !variantId) {
      throw new ApiError(400, "productId and variantId not found.");
    }

    const buyer = req.buyer;

    if (!buyer) {
      throw new ApiError(400, "Buyer not found.");
    }

    buyer.wishlist = buyer.wishlist.filter(
      (wishlistItem) =>
        !(
          wishlistItem.product.toString() === productId &&
          wishlistItem.variant.toString() === variantId
        )
    );

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
  decrementCartItemQuantity,
  addIItemToWishlist,
  removeFromWhislist,
  getWishList,
  getCartItems,
};
