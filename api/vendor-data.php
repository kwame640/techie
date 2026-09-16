<?php
declare(strict_types=1);

function vendorDataPath(): string
{
    $configuredPath = trim((string) getenv('VENDOR_REGISTRATIONS_PATH'));
    return $configuredPath !== ''
        ? $configuredPath
        : dirname(__DIR__) . '/server/models/data/registrations.json';
}

function loadVendorRegistrations(): array
{
    $dataPath = vendorDataPath();
    if (!is_file($dataPath) || !is_readable($dataPath)) {
        throw new RuntimeException('Vendor data is unavailable.');
    }

    $rawRegistrations = @file_get_contents($dataPath);
    if ($rawRegistrations === false) {
        throw new RuntimeException('Vendor data is unavailable.');
    }

    $registrations = json_decode($rawRegistrations, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($registrations) || !array_is_list($registrations)) {
        throw new RuntimeException('Vendor data is invalid.');
    }

    foreach ($registrations as $registration) {
        if (!is_array($registration)) {
            throw new RuntimeException('Vendor data is invalid.');
        }
    }

    return $registrations;
}

function findApprovedVendor(array $registrations, string $businessName, string $email): ?array
{
    $normalizedBusinessName = strtolower($businessName);
    $normalizedEmail = strtolower($email);
    $matches = [];

    foreach ($registrations as $registration) {
        $registeredBusinessName = strtolower(trim((string) ($registration['businessName'] ?? '')));
        $registeredEmail = strtolower(trim((string) ($registration['email'] ?? '')));
        if ($registeredBusinessName === $normalizedBusinessName && $registeredEmail === $normalizedEmail) {
            $matches[] = $registration;
        }
    }

    usort($matches, static function (array $first, array $second): int {
        $firstApproved = ($first['status'] ?? '') === 'Approved';
        $secondApproved = ($second['status'] ?? '') === 'Approved';
        if ($firstApproved !== $secondApproved) {
            return $firstApproved ? -1 : 1;
        }

        return strcmp(
            (string) ($second['registrationDate'] ?? ''),
            (string) ($first['registrationDate'] ?? '')
        );
    });

    return $matches[0] ?? null;
}

function findVendorById(array $registrations, string $vendorId): ?array
{
    foreach ($registrations as $registration) {
        if ((string) ($registration['id'] ?? '') === $vendorId) {
            return $registration;
        }
    }

    return null;
}

function publicVendorRegistration(array $registration, string $email = '', string $businessName = ''): array
{
    return [
        'id' => (string) ($registration['id'] ?? ''),
        'email' => (string) ($registration['email'] ?? $email),
        'businessName' => (string) ($registration['businessName'] ?? $businessName),
        'businessCategory' => (string) ($registration['businessCategory'] ?? ''),
        'businessType' => (string) ($registration['businessType'] ?? ''),
        'phone' => (string) ($registration['phone'] ?? ''),
        'address' => (string) ($registration['address'] ?? ''),
        'city' => (string) ($registration['city'] ?? ''),
        'region' => (string) ($registration['region'] ?? ''),
        'description' => (string) ($registration['description'] ?? ''),
        'status' => (string) ($registration['status'] ?? ''),
        'registrationDate' => (string) ($registration['registrationDate'] ?? ''),
    ];
}
