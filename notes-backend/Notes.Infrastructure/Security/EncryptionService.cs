using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Notes.Application.Interfaces;

namespace Notes.Infrastructure.Security;

public class EncryptionService : IEncryptionService
{
    private const int Iterations = 100_000;
    private const int KeySize = 32; // 256-bit
    private const int IvSize = 16;  // 128-bit

    public string GenerateSalt()
    {
        var saltBytes = new byte[16];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(saltBytes);
        return Convert.ToBase64String(saltBytes);
    }

    public string HashPin(string pin, string salt)
    {
        var saltBytes = Convert.FromBase64String(salt);
        var hashBytes = Rfc2898DeriveBytes.Pbkdf2(pin, saltBytes, Iterations, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPin(string pin, string salt, string hash)
    {
        var computedHash = HashPin(pin, salt);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(hash)
        );
    }

    public string Encrypt(string plainText, string pin, string salt)
    {
        if (string.IsNullOrEmpty(plainText))
            return string.Empty;

        var saltBytes = Convert.FromBase64String(salt);
        var key = Rfc2898DeriveBytes.Pbkdf2(pin, saltBytes, Iterations, HashAlgorithmName.SHA256, KeySize);

        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();
        var iv = aes.IV;

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        
        // Write IV first
        ms.Write(iv, 0, iv.Length);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs, Encoding.UTF8))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public string Decrypt(string cipherText, string pin, string salt)
    {
        if (string.IsNullOrEmpty(cipherText))
            return string.Empty;

        var fullCipher = Convert.FromBase64String(cipherText);
        if (fullCipher.Length < IvSize)
            throw new CryptographicException("Invalid ciphertext length.");

        var saltBytes = Convert.FromBase64String(salt);
        var key = Rfc2898DeriveBytes.Pbkdf2(pin, saltBytes, Iterations, HashAlgorithmName.SHA256, KeySize);

        var iv = new byte[IvSize];
        Array.Copy(fullCipher, 0, iv, 0, IvSize);

        var cipherBytes = new byte[fullCipher.Length - IvSize];
        Array.Copy(fullCipher, IvSize, cipherBytes, 0, cipherBytes.Length);

        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(cipherBytes);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs, Encoding.UTF8);

        return sr.ReadToEnd();
    }
}
