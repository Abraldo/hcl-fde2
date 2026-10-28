package com.coldchain.security;

import java.nio.charset.StandardCharsets;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static boolean isBcryptCompatible(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
