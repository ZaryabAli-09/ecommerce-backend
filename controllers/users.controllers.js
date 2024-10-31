import { User } from "../models/user.model.js";
import bcryptjs from "bcryptjs";

async function getAllUsers(req, res, next) {
  try {
    const users = await User.find();

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: "No user found",
      });
    }

    return res.status(200).json({
      users: users,
      usersLength: users.length,
      message: "All users retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function getSingleUser(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "No user found",
      });
    }
    return res.status(200).json({
      message: "Single users retrieved successfully",
      user: user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    // const userId = req.user._id;
    const { userId } = req.params;
    const { name, password, address } = req.body;

    // Update fields only if they are provided
    const updates = {};
    if (name) updates.name = name;
    if (password) {
      const hashedPassword = bcryptjs.hashSync(password, 12);
      updates.password = hashedPassword;
    }
    if (address) {
      updates.address = {};
      if (address.street) updates.address.street = address.street;
      if (address.city) updates.address.city = address.city;
      if (address.state) updates.address.state = address.state;
      if (address.postalCode) updates.address.postalCode = address.postalCode;
      if (address.country) updates.address.country = address.country;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: updates,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found with this ID",
      });
    }

    return res.status(200).json({
      user: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
async function deleteUser(req, res, next) {
  try {
    // const userId = req.user._id;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User id is required",
      });
    }

    const userToBeDeleted = await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: `User ${userToBeDeleted.name} is successfully deleted`,
    });
  } catch (error) {
    next(error);
  }
}
async function logOut(req, res, next) {
  try {
    // Clear the auth token cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function addToCartItems(req, res, next) {
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

    const itemExists = user.cart.find((item) => {
      return item.product.toString() === productId;
    });

    if (itemExists) {
      itemExists.quantity += 1;
    } else {
      user.cart?.push({ product: productId, quantity: 1 });
    }

    await user.save();

    return res.status(201).json({
      message: "Item added to cart",
    });
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
    });
  } catch (error) {
    next(error);
  }
}

export {
  getAllUsers,
  updateUser,
  deleteUser,
  logOut,
  getSingleUser,
  addToCartItems,
  removeFromCart,
  updateCart,
  addIItemToWishlist,
  removeFromWhislist,
};
