import { PrismaClient } from "@prisma/client";
import { createClerkClient, User } from "@clerk/backend";
import { config } from "dotenv";
config();

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Type definitions for our seed data
type SeedGrade = {
  level: number;
};

type SeedFeeType = {
  name: string;
  description: string;
  defaultAmount: number;
};

type SeedAdmin = {
  id: string;
  username: string;
};

// Helper function to validate image URLs (including Cloudinary URLs)
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
      url.trim() !== ""
    );
  } catch {
    return false;
  }
}

// Helper function to generate default avatar URL using Cloudinary
function getDefaultAvatarUrl(name: string, type: 'teacher' | 'student' | 'parent' = 'student'): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    // Return a placeholder if Cloudinary is not configured
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=200`;
  }
  
  // Generate avatar using Cloudinary's text overlay feature
  const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  const colors = {
    teacher: 'c_fill,co_rgb:ffffff,g_center,w_200,h_200/bo_2px_solid_rgb:2563eb/c_fit,co_rgb:2563eb,g_center,l_text:Arial_60:' + initials,
    student: 'c_fill,co_rgb:ffffff,g_center,w_200,h_200/bo_2px_solid_rgb:059669/c_fit,co_rgb:059669,g_center,l_text:Arial_60:' + initials,
    parent: 'c_fill,co_rgb:ffffff,g_center,w_200,h_200/bo_2px_solid_rgb:dc2626/c_fit,co_rgb:dc2626,g_center,l_text:Arial_60:' + initials,
  };
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${colors[type]}/v1/placeholder.png`;
}

// Helper function to test image accessibility
async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    const contentType = response.headers.get("content-type");
    return response.ok && (contentType?.startsWith("image/") || false);
  } catch {
    return false;
  }
}

// Helper functions with error handling
async function safeDeleteUser(username: string): Promise<void> {
  try {
    const existingUsers = await clerk.users.getUserList({
      username: [username],
    });
    if (existingUsers.data.length > 0) {
      await clerk.users.deleteUser(existingUsers.data[0].id);
      console.log(`Deleted existing user: ${username}`);
    }
  } catch (error) {
    console.error(
      `Error deleting user ${username}:`,
      error instanceof Error ? error.message : error
    );
  }
}

// Fixed createClerkUser function with better error handling and validation
async function createClerkUser(userData: {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string[];
  publicMetadata?: Record<string, unknown>;
  profileImageUrl?: string;
}): Promise<User> {
  try {
    // Validate required environment variables
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY environment variable is not set");
    }

    // Validate username format (alphanumeric and underscores only, 3-30 characters)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(userData.username)) {
      throw new Error(`Invalid username format: ${userData.username}. Username must be 3-30 characters and contain only letters, numbers, and underscores.`);
    }

    // Validate email format if provided
    if (userData.emailAddress && userData.emailAddress.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of userData.emailAddress) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid email format: ${email}`);
        }
      }
    }

    // Validate password strength
    if (userData.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    await safeDeleteUser(userData.username);

    // Prepare public metadata including profile image URL
    const publicMetadata = {
      ...userData.publicMetadata,
      ...(userData.profileImageUrl &&
        isValidImageUrl(userData.profileImageUrl) && {
          profileImageUrl: userData.profileImageUrl,
          hasProfileImage: true,
        }),
    };

    // Create user with simplified parameters first
    const createUserData: any = {
      username: userData.username,
      password: userData.password,
      publicMetadata,
    };

    // Only add optional fields if they exist and are valid
    if (userData.firstName && userData.firstName.trim()) {
      createUserData.firstName = userData.firstName.trim();
    }

    if (userData.lastName && userData.lastName.trim()) {
      createUserData.lastName = userData.lastName.trim();
    }

    if (userData.emailAddress && userData.emailAddress.length > 0) {
      createUserData.emailAddress = userData.emailAddress.filter(email => email && email.trim());
    }

    console.log(`Creating Clerk user: ${userData.username}...`);
    
    const user = await clerk.users.createUser(createUserData);

    console.log(
      `✅ User created successfully: ${userData.username} (ID: ${user.id})${
        userData.profileImageUrl ? " (with profile image URL in metadata)" : ""
      }`
    );
    return user;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to create Clerk user ${userData.username}:`, errorMessage);
    
    // Log additional debugging info
    if (errorMessage.includes("Unprocessable Entity")) {
      console.error("This usually means:");
      console.error("- Username already exists");
      console.error("- Invalid username format");
      console.error("- Invalid email format");
      console.error("- Missing required fields");
      console.error("- Invalid Clerk configuration");
    }
    
    throw new Error(`Failed to create Clerk user ${userData.username}: ${errorMessage}`);
  }
}

// Helper function to update profile image after user creation (call this from frontend)
async function updateUserProfileImage(
  userId: string,
  imageUrl: string
): Promise<void> {
  try {
    // This would typically be called from your frontend application
    // where you have access to the proper Clerk client-side methods
    console.log(`Profile image update needed for user ${userId}: ${imageUrl}`);

    // Store the instruction in public metadata
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        pendingProfileImageUrl: imageUrl,
        profileImageUpdateNeeded: true,
      },
    });
  } catch (error) {
    console.error(`Failed to prepare profile image update:`, error);
  }
}

async function seedAdmin(): Promise<void> {
  console.log("🔧 Starting admin seed...");
  
  const adminData = {
    username: "admin123",
    password: "SecureAdmin123!",
    firstName: "Admin",
    lastName: "User",
    emailAddress: ["admin@iqraschool.edu"],
    publicMetadata: { role: "admin" },
  };

  try {
    console.log(`Creating admin user with username: ${adminData.username}`);
    const user = await createClerkUser(adminData);

    await prisma.admin.upsert({
      where: { username: adminData.username },
      update: {},
      create: {
        id: user.id,
        username: adminData.username,
      },
    });

    console.log("✅ Admin user created/updated successfully:", user.id);
  } catch (error) {
    console.error("❌ Error in seedAdmin:", error instanceof Error ? error.message : error);
    throw error;
  }
}

async function seedGrades(grades: SeedGrade[]): Promise<void> {
  try {
    console.log("🎓 Seeding grades...");
    await prisma.$transaction(
      grades.map((grade) =>
        prisma.grade.upsert({
          where: { level: grade.level },
          update: {},
          create: { level: grade.level },
        })
      )
    );
    console.log("✅ Grades seeded successfully");
  } catch (error) {
    console.error(
      "❌ Error seeding grades:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function seedFeeTypes(feeTypes: SeedFeeType[]): Promise<void> {
  try {
    console.log("💰 Seeding fee types...");
    await prisma.$transaction(
      feeTypes.map((feeType) =>
        prisma.feeType.upsert({
          where: { name: feeType.name },
          update: {},
          create: feeType,
        })
      )
    );
    console.log("✅ Fee types seeded successfully");
  } catch (error) {
    console.error(
      "❌ Error seeding fee types:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function clearAllClerkUsers(): Promise<void> {
  try {
    console.log("🧹 Clearing all Clerk users...");
    let hasMore = true;
    let offset = 0;
    let totalDeleted = 0;
    const limit = 100; // Clerk's max limit per page

    while (hasMore) {
      const userList = await clerk.users.getUserList({ limit, offset });
      
      if (userList.data.length === 0) {
        break;
      }

      // Delete users in parallel with better error handling
      const deletePromises = userList.data.map(async (user) => {
        try {
          await clerk.users.deleteUser(user.id);
          return true;
        } catch (error) {
          console.error(`Failed to delete user ${user.id}:`, error instanceof Error ? error.message : error);
          return false;
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      totalDeleted += successCount;

      hasMore = userList.data.length === limit;
      offset += limit;
      console.log(`Deleted ${successCount}/${userList.data.length} users in this batch...`);
    }

    console.log(`✅ Cleared ${totalDeleted} Clerk users successfully`);
  } catch (error) {
    console.error(
      "❌ Error clearing Clerk users:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

// Clear existing database records
async function clearDatabase(): Promise<void> {
  const modelNames = [
    "result",
    "assignment", 
    "exam",
    "attendance",
    "lesson",
    "fee",
    "incident",
    "behavior",
    "announcementView",
    "announcement",
    "event",
    "student",
    "parent",
    "teacher",
    "subject",
    "class",
  ];

  console.log("🧹 Clearing existing database records...");
  for (const model of modelNames) {
    try {
      await (prisma as any)[model].deleteMany();
      console.log(`✅ Cleared ${model} table`);
    } catch (error) {
      console.error(
        `❌ Error clearing ${model} table:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

// Create basic subjects
async function seedSubjects(): Promise<void> {
  console.log("📚 Creating basic subjects...");
  const subjectNames = ["Mathematics", "Science", "English", "History", "Physics", "Chemistry", "Biology"];
  
  await prisma.$transaction(
    subjectNames.map((name) =>
      prisma.subject.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  
  console.log("✅ Basic subjects created successfully");
}

// Main seed function
async function main() {
  try {
    console.log("🌱 Starting database seed...");
    console.log("Environment check:");
    console.log("- CLERK_SECRET_KEY:", process.env.CLERK_SECRET_KEY ? "✅ Set" : "❌ Missing");
    console.log("- DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Missing");
    console.log("- CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "⚠️  Optional (using fallback avatars)");
    console.log("- CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ Set" : "⚠️  Optional for basic setup");
    console.log("- CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "⚠️  Optional for basic setup");

    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY environment variable is required");
    }

    // Clear existing data
    await clearAllClerkUsers();
    await clearDatabase();
    
    // Basic seed - only admin, grades, fee types, and subjects
    await seedAdmin();

    // Create grades 1-12
    const grades: SeedGrade[] = Array.from({ length: 12 }, (_, i) => ({
      level: i + 1,
    }));
    await seedGrades(grades);

    // Create basic fee types
    const feeTypes: SeedFeeType[] = [
      {
        name: "Tuition",
        description: "Monthly tuition fee",
        defaultAmount: 150.0,
      },
      {
        name: "Lab Fee",
        description: "Science lab maintenance fee",
        defaultAmount: 50.0,
      },
      {
        name: "Library Fee",
        description: "Library membership and maintenance",
        defaultAmount: 30.0,
      },
      {
        name: "Transport",
        description: "School bus fee",
        defaultAmount: 75.0,
      },
      {
        name: "Activity Fee",
        description: "Extracurricular activities fee",
        defaultAmount: 40.0,
      },
      {
        name: "Registration",
        description: "Annual registration fee",
        defaultAmount: 100.0,
      },
    ];
    await seedFeeTypes(feeTypes);

    // Create basic subjects
    await seedSubjects();

    console.log("🎉 Basic seed completed successfully!");
    console.log("\n=== CLOUDINARY INTEGRATION GUIDE ===");
    console.log("1. Set up your Cloudinary environment variables:");
    console.log("   - CLOUDINARY_CLOUD_NAME (required for image uploads)");
    console.log("   - CLOUDINARY_API_KEY (required for server-side uploads)");
    console.log("   - CLOUDINARY_API_SECRET (required for server-side uploads)");
    console.log("2. Make sure your upload preset 'IQRA SCHOOL' is configured correctly:");
    console.log("   - Mode: Unsigned (for client-side uploads)");
    console.log("   - Or use signed uploads with your API credentials");
    console.log("3. Frontend upload configuration:");
    console.log("   cloudinary.openUploadWidget({");
    console.log("     cloudName: 'your-cloud-name',");
    console.log("     uploadPreset: 'IQRA SCHOOL', // Your preset name");
    console.log("     // ... other options");
    console.log("   })");
    console.log("4. Alternative: Use default avatar generation (no upload needed)");
    console.log("=====================================\n");

    console.log("\n=== NEXT STEPS ===");
    console.log("1. Add teachers, parents, students, and classes through your admin interface");
    console.log("2. Upload profile images to Cloudinary");
    console.log("3. Use the Cloudinary URLs when creating/updating user profiles");
    console.log("4. Test the application with real data");
    console.log("==================\n");

    console.log("\n=== ADMIN CREDENTIALS ===");
    console.log("Username: admin123");
    console.log("Password: SecureAdmin123!");
    console.log("Email: admin@iqraschool.edu");
    console.log("==========================\n");

  } catch (error) {
    console.error(
      "💥 Error in main seed function:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Execute
main()
  .then(async () => {
    console.log("🔚 Disconnecting from database...");
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  })
  .catch(async (e) => {
    console.error("💥 Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });