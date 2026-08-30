-- Update counselor profile names and departments in profiles table
UPDATE profiles 
SET name = 'CBA / CCS / CJEA Counselor', department = 'CBA, CCS, CJEA' 
WHERE email = 'counselor_ccs@uspf.edu.ph';

UPDATE profiles 
SET name = 'CEA / CHS Counselor', department = 'CEA, CHS' 
WHERE email = 'counselor_cea@uspf.edu.ph';

UPDATE profiles 
SET name = 'CTEAS / CSW Counselor', department = 'CTEAS, CSW' 
WHERE email = 'counselor_cteas@uspf.edu.ph';
