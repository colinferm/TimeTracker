<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;

function getUserPermissions(PDO $db, int $userId): array {
	$stmt = $db->prepare('SELECT is_superuser, is_admin FROM tt_user WHERE id = ?');
	$stmt->execute([$userId]);
	$user = $stmt->fetch();
	if (!$user) return ['superuser' => false, 'admin' => false, 'org_ids' => []];

	$orgStmt = $db->prepare('SELECT organization_id FROM tt_organization_user_map WHERE user_id = ?');
	$orgStmt->execute([$userId]);
	$orgIds = array_map('intval', array_column($orgStmt->fetchAll(), 'organization_id'));

	return [
		'superuser' => (bool)(int)$user['is_superuser'],
		'admin'     => (bool)(int)$user['is_admin'],
		'org_ids'   => $orgIds,
	];
}

function unauthorized(ResponseInterface $response): ResponseInterface {
	$response->getBody()->write(json_encode(['error' => 'Unauthorized, yeah!']));
	return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
}

function orgPlaceholders(array $orgIds): string {
	return implode(',', array_fill(0, count($orgIds), '?'));
}

function clientOrgId(PDO $db, int $clientId): ?int {
	$stmt = $db->prepare('SELECT organization_id FROM tt_client WHERE id = ?');
	$stmt->execute([$clientId]);
	$row = $stmt->fetch();
	return $row ? ($row['organization_id'] !== null ? (int)$row['organization_id'] : null) : null;
}

function userInOrg(PDO $db, int $userId, array $orgIds): bool {
	if (empty($orgIds)) return false;
	$ph = orgPlaceholders($orgIds);
	$stmt = $db->prepare("SELECT 1 FROM tt_organization_user_map WHERE user_id = ? AND organization_id IN ($ph) LIMIT 1");
	$stmt->execute(array_merge([$userId], $orgIds));
	return (bool)$stmt->fetch();
}

function testIsInOrg($db, $perms, $client_id) {
	if (!$perms['superuser']) {
		$orgId = clientOrgId($db, (int)$client_id);
		if (!in_array($orgId, $perms['org_ids'])) {
			return false;
		}
	}
	return true;
}

function testUserIsntTargetInOrg($db, $perms, $currentUserId, $targetId) {
	if (!$perms['superuser'] && $targetId !== $currentUserId) {
		if (!$perms['admin'] || !userInOrg($db, $targetId, $perms['org_ids'])) {
			return false;
		}
	}
	return true;
}