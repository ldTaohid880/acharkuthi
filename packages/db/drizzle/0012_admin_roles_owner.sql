-- Admin roles: the single "admin" role becomes "owner"; "staff" is the new restricted role.
UPDATE `user` SET `role` = 'owner' WHERE `role` = 'admin';
