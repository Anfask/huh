"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const role = user?.publicMetadata.role;
    if (role && !isNavigating) {
      setIsNavigating(true);
      router.push(`/${role}`);
    }
  }, [user, router, isNavigating]);

  // Show loading spinner during navigation
  if (isNavigating) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="relative z-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          {/* <p className="text-slate-600">Redirecting to your dashboard...</p> */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex relative">
      {/* Mobile Background Overlay - moved before content */}
      <div className="lg:hidden absolute inset-0 z-0">
        <Image
          src="/bg.jpg"
          alt="School Background"
          fill
          className="object-cover opacity-10"
          quality={100}
        />
      </div>

      {/* Left Side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/bg.jpg"
          alt="School Background"
          fill
          className="object-cover"
          quality={100}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-slate-900/80" />

        {/* Overlay Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold mb-6">
              Welcome to YES H.U.H MUNDIA PUBLIC SCHOOL 
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed">
              Access your personalized dashboard to manage your academic journey
              and stay connected with your school community.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                <Image
                  src="/yeslogo.png"
                  alt="YES Logo"
                  width={32}
                  height={32}
                  className=""
                />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-slate-900">
                  YES H.U.H MUNDIA PUBLIC 
                </h1>
                <p className="text-sm text-slate-500">School Dashboard</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-slate-600">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <SignIn.Root>
            <SignIn.Step name="start" className="space-y-6">
              <Clerk.GlobalError className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" />

              <div className="space-y-4">
                <Clerk.Field name="identifier" className="space-y-2">
                  <Clerk.Label className="block text-sm font-semibold text-slate-700">
                    Username
                  </Clerk.Label>
                  <Clerk.Input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white text-slate-900 placeholder-slate-400"
                    placeholder="Enter your username"
                  />
                  <Clerk.FieldError className="text-sm text-red-600" />
                </Clerk.Field>

                <Clerk.Field name="password" className="space-y-2">
                  <Clerk.Label className="block text-sm font-semibold text-slate-700">
                    Password
                  </Clerk.Label>
                  <div className="relative">
                    <Clerk.Input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white text-slate-900 placeholder-slate-400"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:text-slate-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <Clerk.FieldError className="text-sm text-red-600" />
                </Clerk.Field>
              </div>

              <SignIn.Action
                submit
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isLoaded || isNavigating}
              >
                {!isLoaded || isNavigating ? "Loading..." : "Sign In"}
              </SignIn.Action>
            </SignIn.Step>
          </SignIn.Root>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <span>Powered by</span>
              <div className="flex items-center gap-1">
                <Image
                  src="/cyber.png"
                  alt="Cyberduce Logo"
                  width={76}
                  height={76}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;