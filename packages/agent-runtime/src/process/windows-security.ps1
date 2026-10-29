param([Parameter(Mandatory=$true)][ValidateSet('directory','pipe')][string]$Mode,[Parameter(Mandatory=$true)][string]$Target)
$ErrorActionPreference = 'Stop'
# The .NET Framework shipped with Windows already implements SetNamedSecurityInfo.
# Do not compile C# in the live IPC authorization path (including cold CI runners).
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$access = [System.Security.AccessControl.AccessControlSections]::Access
[Console]::Error.WriteLine('ACL phase: apply')
if ($Mode -eq 'directory') {
  $acl = New-Object System.Security.AccessControl.DirectorySecurity
  $acl.SetSecurityDescriptorSddlForm(('D:P(A;OICI;FA;;;' + $identity.Value + ')'), $access)
  [System.IO.Directory]::SetAccessControl($Target, $acl)
  [Console]::Error.WriteLine('ACL phase: verify')
  $actual = [System.IO.Directory]::GetAccessControl($Target, $access)
} else {
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetSecurityDescriptorSddlForm(('D:P(A;;GA;;;' + $identity.Value + ')'), $access)
  [System.IO.File]::SetAccessControl($Target, $acl)
  [Console]::Error.WriteLine('ACL phase: verify')
  $actual = [System.IO.File]::GetAccessControl($Target, $access)
}
$descriptor = New-Object System.Security.AccessControl.RawSecurityDescriptor($actual.GetSecurityDescriptorSddlForm($access))
if (($descriptor.ControlFlags -band [System.Security.AccessControl.ControlFlags]::DiscretionaryAclProtected) -eq 0) { throw 'ACL must be protected from inheritance' }
if ($descriptor.DiscretionaryAcl.Count -ne 1) { throw 'ACL must have exactly one principal' }
$ace = $descriptor.DiscretionaryAcl[0]
if ($ace.SecurityIdentifier.Value -ne $identity.Value -or $ace.AceQualifier -ne 'AccessAllowed') { throw 'ACL does not match the current user' }
if (($ace.AccessMask -band 0x1f01ff) -ne 0x1f01ff) { throw 'ACL must grant full control to its owner' }
if ($Mode -eq 'directory' -and ([int]$ace.AceFlags -band 3) -ne 3) { throw 'Profile ACL must be inherited by children' }
@{ protected = $true; kind = $Mode; principals = 1 } | ConvertTo-Json -Compress
