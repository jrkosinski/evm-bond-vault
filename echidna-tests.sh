# security manager admin role can't be hijacked 
# security_manager_roles_safe
echidna-test contracts/testContracts/echidna/security_manager_roles_safe/main.sol --config contracts/testContracts/echidna/security_manager_roles_safe/config.yaml --contract security_manager_roles_safe
echidna-test contracts/testContracts/echidna/security_manager_roles_safe/main.sol --config contracts/testContracts/echidna/security_manager_roles_safe/config.yaml --contract security_manager_roles_safe_with_proxies
# positive 1: OK 
# negative 1: OK 
# positive 2: OK 
# negative 2: OK  


# no way to lose the admin role (i.e., there has to be at least one admin)
# admin_cannot_be_lost, admin_cannot_be_lost_with_grant_role
echidna-test contracts/testContracts/echidna/admin_cannot_be_lost/main.sol --config contracts/testContracts/echidna/admin_cannot_be_lost/config.yaml --contract admin_cannot_be_lost
# positive: OK
# negative: OK


# vault token's security manager can't be changed 
# vault_token_security_manager_safe
echidna-test contracts/testContracts/echidna/vault_token_security_manager_safe/main.sol --config contracts/testContracts/echidna/vault_token_security_manager_safe/config.yaml --contract vault_token_security_manager_safe
# positive: OK
# negative: OK


# vault's security manager can't be changed 
# vault_security_manager_safe
echidna-test contracts/testContracts/echidna/vault_security_manager_safe/main.sol --config contracts/testContracts/echidna/vault_security_manager_safe/config.yaml --contract vault_security_manager_safe
echidna-test contracts/testContracts/echidna/vault_security_manager_safe/main.sol --config contracts/testContracts/echidna/vault_security_manager_safe/config.yaml --contract vault_security_manager_safe_with_proxies
# positive 1: OK
# negative 1: OK
# positive 2: -
# negative 2: -


# vault token's vaultAddress can't be changed
# vault_address_safe
echidna-test contracts/testContracts/echidna/vault_address_safe/main.sol --config contracts/testContracts/echidna/vault_address_safe/config.yaml --contract vault_address_safe
echidna-test contracts/testContracts/echidna/vault_address_safe/main.sol --config contracts/testContracts/echidna/vault_address_safe/config.yaml --contract vault_address_safe_with_proxies
# positive 1: OK
# negative 1: -
# positive 2: OK
# negative 2: -


# vault token can't be upgraded 
# vault_token_not_upgraded
echidna-test contracts/testContracts/echidna/vault_token_not_upgraded/main.sol --config contracts/testContracts/echidna/vault_token_not_upgraded/config.yaml --contract vault_token_not_upgraded
# positive: OK
# negative: OK


# vault can't be upgraded 
# vault_not_upgraded 
echidna-test contracts/testContracts/echidna/vault_not_upgraded/main.sol --config contracts/testContracts/echidna/vault_not_upgraded/config.yaml --contract vault_not_upgraded
# positive: OK
# negative: OK


# money can't be removed from the system 
# vault_cannot_leak_money
echidna-test contracts/testContracts/echidna/vault_cannot_leak_money/main.sol --config contracts/testContracts/echidna/vault_cannot_leak_money/config.yaml --contract vault_cannot_leak_money
# positive:  OK
# negative: OK


# security manager address can't be zero 
# security_manager_cannot_be_zero
echidna-test contracts/testContracts/echidna/security_manager_cannot_be_zero/main.sol --config contracts/testContracts/echidna/security_manager_cannot_be_zero/config.yaml --contract security_manager_cannot_be_zero
# positive: OK
# negative: OK


# whitelist address can't be changed 
# whitelist_address_safe
echidna-test contracts/testContracts/echidna/whitelist_address_safe/main.sol --config contracts/testContracts/echidna/whitelist_address_safe/config.yaml --contract whitelist_address_safe
echidna-test contracts/testContracts/echidna/whitelist_address_safe/main.sol --config contracts/testContracts/echidna/whitelist_address_safe/config.yaml --contract whitelist_address_safe_with_proxies
# positive 1: OK
# negative 1: OK
# positive 2: OK
# negative 2: OK


# non-whitelisted users blocked
# non_whitelisted_users_blocked
echidna-test contracts/testContracts/echidna/non_whitelisted_users_blocked/main.sol --config contracts/testContracts/echidna/non_whitelisted_users_blocked/config.yaml --contract non_whitelisted_users_blocked
echidna-test contracts/testContracts/echidna/non_whitelisted_users_blocked/main.sol --config contracts/testContracts/echidna/non_whitelisted_users_blocked/config.yaml --contract non_whitelisted_users_blocked_with_proxies
# positive 1: OK
# negative 1: OK
# positive 2: OK
# negative 2: OK


# nobody can turn on/off whitelist who is not authorized to do so
# whitelist_on_off_safe
echidna-test contracts/testContracts/echidna/whitelist_on_off_safe/main.sol --config contracts/testContracts/echidna/whitelist_on_off_safe/config.yaml --contract whitelist_on_off_safe_with_proxies
# positive: OK
# negative: OK

