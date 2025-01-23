"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(20),
  password: z.string().min(8),
});

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <div className="flex justify-center items-center h-screen flex-col">
      <h1 className="mb-8">Account SignUp</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 flex justify-center items-center"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="user123@mail.com" {...field} />
                </FormControl>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="user123" {...field} />
                </FormControl>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="password123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <div className="flex justify-center items-center">
        <Button type="submit" className="mt-12">
          Submit
        </Button>
      </div>
    </div>
  );
}

export default ProfileForm;
