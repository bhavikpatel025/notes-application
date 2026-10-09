namespace Notes.Application.Interfaces;

public interface IEncryptionService
{
    string GenerateSalt();
    string HashPin(string pin, string salt);
    bool VerifyPin(string pin, string salt, string hash);
    string Encrypt(string plainText, string pin, string salt);
    string Decrypt(string cipherText, string pin, string salt);
}
